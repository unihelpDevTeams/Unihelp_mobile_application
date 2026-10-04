import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import EvosAura from '../../src/shared/components/EvosAura';
import ConfirmDialog from '../../src/shared/components/ConfirmDialog';
import { PageLoader } from '../../src/shared/components/AILoaders';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { isPremiumActive } from '../../src/shared/services/premium';
import { GENDER_OPTIONS } from '../../src/signup/validation';
import {
  RELATIONSHIP,
  acceptFriendRequest,
  blockStudent,
  cancelFriendRequest,
  createOrOpenFriendConversation,
  declineFriendRequest,
  fetchFriendStats,
  listenRelationship,
  removeFriend,
  sendFriendRequest,
  sendMessageRequest,
  unblockStudent,
  getUserProfileById,
} from '../../src/shared/services/friendships';

const INTRO_MAX = 500;

export default function ViewUserProfile() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user, profile: currentProfile } = useAuth();
  const { colors } = useTheme();

  // Route params can be string | string[]
  const rawId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const targetUid = String(rawId || '');

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [relationship, setRelationship] = useState({ state: RELATIONSHIP.NONE });
  const [busy, setBusy] = useState('');
  const [messageModal, setMessageModal] = useState(false);
  const [intro, setIntro] = useState('');
  const [messageError, setMessageError] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [friendStats, setFriendStats] = useState(null);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  // Theme-safe danger colours (the file mixed colors.error / colors.red / colors.danger)
  const danger = colors.error ?? colors.danger ?? colors.red;
  const dangerSoft = colors.dangerLight ?? colors.redLight ?? colors.surfaceSecondary;
  const success = colors.success ?? colors.brand;
  const successSoft = colors.successLight ?? colors.brandLight;

  /* ---------- data ---------- */

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setLoadError(false);
    setFriendStats(null);
    if (!targetUid) {
      setLoading(false); // previously stayed on the loader forever without a userId
      return undefined;
    }
    setLoading(true);
    getUserProfileById(targetUid)
      .then((data) => {
        if (!cancelled) setProfile(data || null);
      })
      .catch((error) => {
        console.warn('Failed to load user profile', error);
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [targetUid, reloadKey]);

  useEffect(() => {
    setRelationship({ state: RELATIONSHIP.NONE });
    if (!user?.uid || !targetUid || user.uid === targetUid) return undefined;
    return listenRelationship(user.uid, targetUid, setRelationship);
  }, [targetUid, user?.uid]);

  // Depends on targetUid only — it used to refetch whenever profile.friendCount changed.
  useEffect(() => {
    let cancelled = false;
    if (!targetUid) return undefined;
    fetchFriendStats(targetUid)
      .then((stats) => {
        if (!cancelled) setFriendStats(stats);
      })
      .catch((error) => {
        console.warn('Failed to load friend stats', error);
        if (!cancelled) setFriendStats({ friendCount: null, mutualCount: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [targetUid]);

  const friendCount = Number(friendStats?.friendCount ?? profile?.friendCount ?? 0) || 0;
  const mutualCount = Number(friendStats?.mutualCount ?? 0) || 0;

  const avatarUrl = String(profile?.photo || profile?.photoURL || '').trim();
  const avatarThumbUrl = String(profile?.photoThumb || avatarUrl).trim();
  const coverUrl = String(profile?.coverPhoto || profile?.cover || profile?.coverUrl || profile?.banner || '').trim();

  useEffect(() => setAvatarFailed(false), [avatarUrl]);
  useEffect(() => setCoverFailed(false), [coverUrl]);

  // Success messages fade out on their own; errors stay until the next action.
  useEffect(() => {
    if (feedback?.type !== 'success') return undefined;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const initials = useMemo(() => {
    const source = profile?.username || profile?.email || 'S';
    return (
      source
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('') || 'S'
    );
  }, [profile]);

  const isSelf = user?.uid === targetUid;
  const isBlocked = relationship.state === RELATIONSHIP.BLOCKED;
  const blockedByMe = isBlocked && relationship.blockedByMe;
  const premiumActive = isPremiumActive(profile);
  const isFriend = relationship.state === RELATIONSHIP.FRIENDS;
  // Email is private: only the owner and friends see it.
  const showEmail = !isBlocked && !!profile?.email && (isSelf || isFriend);

  const academicItems = [
    { icon: 'school-outline', label: 'Institution', value: profile?.school },
    { icon: 'library-outline', label: 'Department', value: profile?.department },
    { icon: 'ribbon-outline', label: 'Level', value: profile?.level },
    { icon: 'location-outline', label: 'Location', value: profile?.location },
  ].filter((item) => String(item.value || '').trim());

  const rawDateOfBirth = profile?.dateOfBirth || profile?.date_of_birth || '';
  const birthDateParts = typeof rawDateOfBirth === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.exec(rawDateOfBirth);
  const parsedBirthDate = birthDateParts
    ? new Date(Number(birthDateParts[1]), Number(birthDateParts[2]) - 1, Number(birthDateParts[3]))
    : null;
  const personalItems = isSelf
    ? [
        {
          icon: 'person-circle-outline',
          label: 'Gender',
          value: GENDER_OPTIONS.find((item) => item.value === profile?.gender)?.label || '',
        },
        {
          icon: 'calendar-outline',
          label: 'Date of birth',
          value: parsedBirthDate && !Number.isNaN(parsedBirthDate.getTime())
            ? parsedBirthDate.toLocaleDateString()
            : '',
        },
      ].filter((item) => String(item.value || '').trim())
    : [];

  /* ---------- actions ---------- */

  const runAction = useCallback(async (key, task, successText) => {
    setBusy(key);
    setFeedback(null);
    try {
      await task();
      if (successText) setFeedback({ type: 'success', text: successText });
    } catch (error) {
      setFeedback({ type: 'error', text: error?.message || 'Something went wrong. Please try again.' });
    } finally {
      setBusy('');
    }
  }, []);

  const openChat = () =>
    runAction('message', async () => {
      const conversationId = await createOrOpenFriendConversation({
        currentUser: user,
        otherUser: { id: targetUid, ...profile },
        currentProfile,
        otherProfile: profile,
      });
      router.navigate(`/messages/${conversationId}`);
    });

  const closeMessageModal = () => {
    Keyboard.dismiss();
    setMessageModal(false);
    setMessageError('');
  };

  // Errors now show inside the sheet (they used to appear hidden behind the modal),
  // and an empty intro can no longer be sent.
  const submitMessageRequest = async () => {
    const text = intro.trim();
    if (!text) {
      setMessageError('Write a short introduction first.');
      return;
    }
    setBusy('messageRequest');
    setMessageError('');
    try {
      await sendMessageRequest({
        currentUid: user.uid,
        targetUid,
        message: text,
        currentProfile,
        targetProfile: profile,
      });
      setIntro('');
      closeMessageModal();
      setFeedback({ type: 'success', text: 'Message request sent.' });
    } catch (error) {
      setMessageError(error?.message || 'Could not send the request. Please try again.');
    } finally {
      setBusy('');
    }
  };

  const confirmRemove = () =>
    setConfirmDialog({
      title: 'Remove friend?',
      message: 'This student will no longer be able to chat with you freely.',
      confirmLabel: 'Remove',
      variant: 'destructive',
      icon: 'person-remove-outline',
      onConfirm: () =>
        runAction('remove', () => removeFriend({ currentUid: user.uid, friendUid: targetUid, currentProfile }), 'Friend removed.'),
    });

  const confirmBlock = () =>
    setConfirmDialog({
      title: 'Block this student?',
      message: 'They will not be able to send requests or message you until you unblock them.',
      confirmLabel: 'Block',
      variant: 'destructive',
      icon: 'ban-outline',
      onConfirm: () =>
        runAction(
          'block',
          () => blockStudent({ currentUid: user.uid, targetUid, currentProfile, targetProfile: profile }),
          'Student blocked.',
        ),
    });

  const handleUnblock = () =>
    runAction('unblock', () => unblockStudent({ currentUid: user.uid, targetUid }), 'Student unblocked.');

  const anyBusy = !!busy;

  const renderActions = () => {
    if (isSelf || isBlocked) return null;
    const request = relationship.request;

    if (relationship.state === RELATIONSHIP.SENT) {
      return (
        <View style={styles.actionContainer}>
          <View style={[styles.badgeSent, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="time-outline" size={16} color={colors.brand} />
            <Text style={[styles.badgeSentText, { color: colors.brand }]}>Request sent</Text>
          </View>
          <ActionButton
            label="Cancel request"
            icon="close-circle-outline"
            variant="ghost"
            loading={busy === 'cancel'}
            disabled={anyBusy || !request?.id}
            onPress={() => runAction('cancel', () => cancelFriendRequest({ requestId: request.id, currentUid: user.uid }), 'Request cancelled.')}
          />
        </View>
      );
    }

    if (relationship.state === RELATIONSHIP.RECEIVED) {
      return (
        <View style={styles.actionContainer}>
          <ActionButton
            label="Accept"
            icon="checkmark-circle-outline"
            variant="primary"
            loading={busy === 'accept'}
            disabled={anyBusy || !request}
            onPress={() => runAction('accept', () => acceptFriendRequest({ request, currentUid: user.uid, currentProfile }), 'You are now friends.')}
          />
          <ActionButton
            label="Decline"
            icon="close-outline"
            variant="secondary"
            loading={busy === 'decline'}
            disabled={anyBusy || !request}
            onPress={() => runAction('decline', () => declineFriendRequest({ request, currentUid: user.uid, currentProfile }))}
          />
        </View>
      );
    }

    if (isFriend) {
      return (
        <View style={styles.actionContainer}>
          <ActionButton label="Message" icon="chatbubble-ellipses-outline" variant="primary" loading={busy === 'message'} disabled={anyBusy} onPress={openChat} />
          <ActionButton label="Remove" icon="person-remove-outline" variant="secondary" loading={busy === 'remove'} disabled={anyBusy} onPress={confirmRemove} />
          <ActionButton icon="ban-outline" variant="icon" accessibilityLabel="Block student" loading={busy === 'block'} disabled={anyBusy} onPress={confirmBlock} />
        </View>
      );
    }

    return (
      <View style={styles.actionContainer}>
        <ActionButton
          label="Add friend"
          icon="person-add-outline"
          variant="primary"
          loading={busy === 'add'}
          disabled={anyBusy}
          onPress={() =>
            runAction(
              'add',
              () => sendFriendRequest({ currentUid: user.uid, targetUid, currentProfile, targetProfile: profile }),
              'Friend request sent.',
            )
          }
        />
        <ActionButton label="Message" icon="mail-outline" variant="secondary" disabled={anyBusy} onPress={() => setMessageModal(true)} />
        <ActionButton icon="ban-outline" variant="icon" accessibilityLabel="Block student" loading={busy === 'block'} disabled={anyBusy} onPress={confirmBlock} />
      </View>
    );
  };

  /* ---------- render ---------- */

  const cardStyle = { backgroundColor: colors.card, borderColor: colors.borderDefault, shadowColor: colors.shadow };
  const subtitle = profile?.department || profile?.school;

  return (
    <ScreenShell title="Profile" showBack>
      {loading ? (
        <View style={[styles.loadingCard, cardStyle]}>
          <PageLoader label="Fetching student profile..." />
        </View>
      ) : profile ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.headerContainer}>
            <View style={[styles.coverBanner, { backgroundColor: colors.brandLight }]}>
              {coverUrl && !coverFailed && !isBlocked ? (
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
                  <Ionicons name={isBlocked ? 'ban-outline' : 'school-outline'} size={30} color={isBlocked ? danger : colors.brand} />
                  <Text style={[styles.coverFallbackText, { color: isBlocked ? danger : colors.brand }]} numberOfLines={1}>
                    {isBlocked ? 'Profile hidden' : profile?.school || profile?.department || 'UniHelp student'}
                  </Text>
                </View>
              )}
              <View style={styles.coverScrim} />
            </View>
            <View style={styles.avatarWrapper}>
              <EvosAura size={104} active={premiumActive || profile?.role === 'admin'}>
                <View style={[styles.avatarBorder, { backgroundColor: colors.surfacePrimary, shadowColor: colors.shadow }]}>
                  {avatarThumbUrl && !avatarFailed && !isBlocked ? (
                    <Image
                      source={{ uri: avatarThumbUrl }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      accessibilityLabel={`${profile?.username || 'Student'} profile photo`}
                      onError={() => setAvatarFailed(true)}
                    />
                  ) : (
                    <View style={[styles.avatarFallback, { backgroundColor: isBlocked ? dangerSoft : colors.brand }]}>
                      {isBlocked ? (
                        <Ionicons name="ban-outline" size={34} color={danger} />
                      ) : (
                        <Text style={[styles.avatarText, { color: colors.onBrand }]}>{initials}</Text>
                      )}
                    </View>
                  )}
                </View>
              </EvosAura>
            </View>
          </View>

          <View style={styles.profileMeta}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]} accessibilityRole="header" numberOfLines={2}>
                {isBlocked ? 'Blocked student' : profile?.username || 'Student'}
              </Text>
              {!isBlocked && premiumActive ? (
                <Ionicons name="checkmark-circle" size={19} color={colors.brand} accessibilityLabel="Verified Premium student" />
              ) : null}
            </View>
            {!isBlocked && subtitle ? <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>{subtitle}</Text> : null}
            {showEmail ? <Text style={[styles.email, { color: colors.textTertiary }]}>{profile.email}</Text> : null}
          </View>

          {feedback ? (
            <View
              accessibilityLiveRegion="polite"
              style={[
                styles.feedbackBox,
                {
                  backgroundColor: feedback.type === 'error' ? dangerSoft : successSoft,
                  borderColor: feedback.type === 'error' ? danger : success,
                },
              ]}
            >
              <Ionicons
                name={feedback.type === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                size={17}
                color={feedback.type === 'error' ? danger : success}
              />
              <Text style={[styles.feedbackText, { color: feedback.type === 'error' ? danger : success }]}>{feedback.text}</Text>
            </View>
          ) : null}

          {isBlocked ? (
            <View style={[styles.blockedCard, cardStyle]}>
              <View style={[styles.blockedIcon, { backgroundColor: dangerSoft }]}>
                <Ionicons name="ban-outline" size={28} color={danger} />
              </View>
              <Text style={[styles.blockedTitle, { color: colors.textPrimary }]}>
                {blockedByMe ? 'You blocked this student' : 'Profile unavailable'}
              </Text>
              <Text style={[styles.blockedText, { color: colors.textSecondary }]}>
                {blockedByMe
                  ? 'Their profile and messaging are hidden until you unblock them.'
                  : 'You cannot view this profile or start a chat right now.'}
              </Text>
              {blockedByMe ? (
                <ActionButton label="Unblock" icon="lock-open-outline" variant="primary" loading={busy === 'unblock'} disabled={anyBusy} onPress={handleUnblock} />
              ) : null}
            </View>
          ) : (
            <>
              {renderActions()}

              <View style={[styles.statsCard, cardStyle]}>
                <View style={styles.statItem}>
                  <Ionicons name="people" size={20} color={colors.brand} />
                  <View>
                    <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{friendCount}</Text>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{friendCount === 1 ? 'Friend' : 'Friends'}</Text>
                  </View>
                </View>
                {!isSelf ? <View style={[styles.statDivider, { backgroundColor: colors.borderDefault }]} /> : null}
                {!isSelf ? (
                  <View style={styles.statItem}>
                    <Ionicons name="git-network-outline" size={20} color={colors.gold || colors.brand} />
                    <View>
                      <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{mutualCount}</Text>
                      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Mutual</Text>
                    </View>
                  </View>
                ) : null}
              </View>

              <View style={[styles.sectionCard, cardStyle]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Academic profile</Text>
                {academicItems.length ? (
                  <View style={styles.infoGrid}>
                    {academicItems.map((item) => (
                      <InfoTile key={item.label} {...item} />
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.bioText, { color: colors.textTertiary }]}>This student hasn't added academic details yet.</Text>
                )}
              </View>

              {personalItems.length ? (
                <View style={[styles.sectionCard, cardStyle]}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Personal details</Text>
                  <View style={styles.infoGrid}>
                    {personalItems.map((item) => (
                      <InfoTile key={item.label} {...item} />
                    ))}
                  </View>
                  <Text style={[styles.bioText, { color: colors.textTertiary, fontSize: 12 }]}>
                    Only you can see these details.
                  </Text>
                </View>
              ) : null}

              {String(profile?.bio || '').trim() ? (
                <View style={[styles.sectionCard, cardStyle]}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About</Text>
                  <Text style={[styles.bioText, { color: colors.textSecondary }]}>{String(profile.bio).trim()}</Text>
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      ) : (
        <View style={[styles.emptyCard, cardStyle]}>
          <Ionicons name={loadError ? 'cloud-offline-outline' : 'person-circle-outline'} size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {loadError ? "Couldn't load profile" : 'Student not found'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {loadError
              ? 'Check your connection and try again.'
              : 'This profile might have been removed or is no longer accessible.'}
          </Text>
          <View style={styles.emptyActions}>
            {loadError ? <ActionButton label="Try again" icon="refresh-outline" variant="primary" onPress={() => setReloadKey((k) => k + 1)} /> : null}
            <ActionButton label="Go back" icon="arrow-back" variant="secondary" onPress={() => router.back()} />
          </View>
        </View>
      )}

      {/* Message request sheet — KeyboardAvoidingView keeps the input above the keyboard */}
      <Modal visible={messageModal} transparent animationType="slide" statusBarTranslucent onRequestClose={closeMessageModal}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable
            style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
            onPress={closeMessageModal}
            accessibilityLabel="Close message request"
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.modalBackground }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.borderDefault }]} />
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Send message request</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Introduce yourself to {profile?.username || 'this student'}.
            </Text>
            <TextInput
              value={intro}
              onChangeText={(t) => {
                setIntro(t);
                if (messageError) setMessageError('');
              }}
              placeholder="Hi, I'm also studying Mechanical Engineering..."
              placeholderTextColor={colors.placeholder}
              style={[
                styles.messageInput,
                {
                  backgroundColor: colors.inputBackground,
                  borderColor: messageError ? danger : colors.borderDefault,
                  color: colors.textPrimary,
                },
              ]}
              multiline
              maxLength={INTRO_MAX}
              autoFocus
              accessibilityLabel="Introduction message"
            />
            <View style={styles.inputMeta}>
              <Text style={[styles.inputError, { color: danger }]}>{messageError}</Text>
              <Text style={[styles.counter, { color: colors.textTertiary }]}>{intro.length}/{INTRO_MAX}</Text>
            </View>
            <View style={styles.modalActions}>
              <ActionButton label="Cancel" variant="secondary" disabled={busy === 'messageRequest'} onPress={closeMessageModal} />
              <ActionButton
                label="Send request"
                icon="paper-plane-outline"
                variant="primary"
                loading={busy === 'messageRequest'}
                disabled={!intro.trim() || busy === 'messageRequest'}
                onPress={submitMessageRequest}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmDialog
        visible={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        variant={confirmDialog?.variant}
        icon={confirmDialog?.icon}
        loading={['remove', 'block'].includes(busy)}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={async () => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          await action?.();
        }}
      />
    </ScreenShell>
  );
}

function InfoTile({ icon, label, value }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.infoTile, { backgroundColor: colors.canvasLight }]}>
      <View style={[styles.infoIconContainer, { backgroundColor: colors.brandLight }]}>
        <Ionicons name={icon} size={16} color={colors.brand} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ActionButton({ label, icon, variant = 'primary', loading, disabled, onPress, accessibilityLabel }) {
  const { colors } = useTheme();
  const danger = colors.error ?? colors.danger ?? colors.red;
  const dangerSoft = colors.dangerLight ?? colors.redLight ?? colors.surfaceSecondary;
  const isIconOnly = variant === 'icon';

  const bg = { primary: colors.brand, secondary: colors.brandLight, ghost: dangerSoft, icon: colors.surfaceSecondary }[variant];
  const fg = variant === 'primary' ? colors.onBrand : variant === 'ghost' ? danger : variant === 'icon' ? danger : colors.brand;
  const inactive = disabled || loading;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.btn,
        isIconOnly && styles.btnIconOnly,
        { backgroundColor: bg },
        pressed && styles.btnPressed,
        disabled && !loading && styles.btnDisabled,
      ]}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      hitSlop={6}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          {label ? <Text style={[styles.btnText, { color: fg }]}>{label}</Text> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 40 },
  loadingCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center', // was the invalid `justify`
    marginTop: 20,
  },

  headerContainer: { alignItems: 'center', marginBottom: 12 },
  coverBanner: { height: 150, width: '100%', borderRadius: 22, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 24 },
  coverFallbackText: { fontSize: 13, fontWeight: '800' },
  coverScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.08)' },
  avatarWrapper: { marginTop: -52 },
  avatarBorder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    padding: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 48 },
  avatarFallback: { width: '100%', height: '100%', borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800' },

  profileMeta: { alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  name: { fontSize: 23, fontWeight: '800', textAlign: 'center', letterSpacing: -0.2, flexShrink: 1 },
  subtitle: { marginTop: 3, fontSize: 14, fontWeight: '600' },
  email: { marginTop: 3, fontSize: 12.5, fontWeight: '500' },

  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  btn: {
    height: 46,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexGrow: 1,
    flexShrink: 1,
  },
  btnIconOnly: { width: 46, paddingHorizontal: 0, flexGrow: 0, flexShrink: 0 },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '700', fontSize: 14 },
  badgeSent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  badgeSentText: { fontWeight: '700', fontSize: 13 },

  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  statDivider: { width: 1, height: 30, marginHorizontal: 8 },
  statNumber: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, fontWeight: '600' },

  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  feedbackText: { flex: 1, fontSize: 13, fontWeight: '700' },

  blockedCard: {
    borderRadius: 20,
    padding: 22,
    marginHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  blockedIcon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  blockedTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  blockedText: { fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 6, marginBottom: 18 },

  sectionCard: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 14 },
  infoGrid: { gap: 10 },
  infoTile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12 },
  infoIconContainer: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '700' }, // no more all-caps labels
  infoValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  bioText: { fontSize: 14.5, lineHeight: 22 },

  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    marginTop: 40,
    marginHorizontal: 16,
    gap: 6,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', marginTop: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyActions: { flexDirection: 'row', gap: 10, marginTop: 14, alignSelf: 'stretch' },

  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject },
  modalSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalSubtitle: { fontSize: 13, marginTop: 4 },
  messageInput: {
    minHeight: 100,
    maxHeight: 180,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    textAlignVertical: 'top',
    marginTop: 16,
    fontSize: 14.5,
  },
  inputMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, minHeight: 18 },
  inputError: { flex: 1, fontSize: 12.5, fontWeight: '700' },
  counter: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});