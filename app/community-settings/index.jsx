import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Switch,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, saveUserProfile } from '../../services/firestoreSync';
import {
  deleteGroup,
  demoteGroupAdminToMember,
  getGroup,
  leaveGroup,
  listGroupMembers,
  promoteGroupMemberToAdmin,
  removeGroupMember,
} from '../../src/shared/services/community';
import { useTheme } from '../../src/shared/theme/ThemeContext';
import { useThemeStyles } from '../../src/shared/theme/createStyles';

export default function CommunitySettingsPage() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const { profile, user } = useAuth();
  const { colors } = useTheme();
  const styles = useThemeStyles(createStyles);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dmPolicy, setDmPolicy] = useState('open');
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [busyAction, setBusyAction] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [membership, setMembership] = useState(null);

  // Custom Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    description: '',
    confirmText: 'Confirm',
    type: 'destructive',
    onConfirm: () => {},
  });

  // Fetch user preferences
  useEffect(() => {
    if (!profile?.uid) return;
    getUserProfile(profile.uid)
      .then((data) => {
        setNotificationsEnabled(data?.notificationsEnabled ?? true);
        setDmPolicy(data?.dmPolicy || 'open');
      })
      .catch(() => {});
  }, [profile?.uid]);

  // Fetch group data & members
  const loadGroup = useCallback(async () => {
    if (!groupId) {
      setLoadingGroup(false);
      return;
    }
    try {
      const [groupData, memberData] = await Promise.all([
        getGroup(groupId),
        listGroupMembers(groupId),
      ]);
      setGroup(groupData);
      setMembers(
        (memberData || []).filter((member) => member.uid !== groupData?.ownerId)
      );
      const myMembership = (memberData || []).find(
        (m) => m.uid === profile?.uid
      );
      setMembership(myMembership || null);
    } catch (_error) {
      setMessage('Failed to load group details.');
      setMessageType('error');
    } finally {
      setLoadingGroup(false);
    }
  }, [groupId, profile?.uid]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const saveSettings = async (nextPolicy, nextNotifications) => {
    setSaving(true);
    setDmPolicy(nextPolicy);
    setNotificationsEnabled(nextNotifications);
    try {
      await saveUserProfile({ dmPolicy: nextPolicy, notificationsEnabled: nextNotifications });
      setMessage('Settings saved successfully.');
      setMessageType('success');
    } catch (_error) {
      setMessage('Failed to save settings.');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  // Promote Member to Admin
  const makeAdmin = async (memberId) => {
    if (!groupId || !user?.uid || !memberId) return;
    setBusyAction(memberId);
    setMessage('');
    try {
      await promoteGroupMemberToAdmin(groupId, memberId, user.uid);
      setMessage('Member promoted to admin successfully.');
      setMessageType('success');
      await loadGroup();
    } catch (error) {
      setMessage(error?.message || 'Unable to promote this member.');
      setMessageType('error');
    } finally {
      setBusyAction(null);
    }
  };

  // Demote Admin to Member
  const confirmDemoteAdmin = (member) => {
    showConfirmationModal(
      'Remove Admin Rights',
      `Are you sure you want to remove admin privileges from ${member.name || 'this user'}?`,
      'Remove Admin',
      'warning',
      () => demoteAdmin(member.uid)
    );
  };

  const demoteAdmin = async (memberId) => {
    if (!groupId || !user?.uid || !memberId) return;
    setBusyAction(memberId);
    setMessage('');
    try {
      await demoteGroupAdminToMember(groupId, memberId, user.uid);
      setMessage('Admin role removed successfully.');
      setMessageType('success');
      await loadGroup();
    } catch (error) {
      setMessage(error?.message || 'Unable to remove admin privileges.');
      setMessageType('error');
    } finally {
      setBusyAction(null);
    }
  };

  // Remove Member from Group
  const confirmKickMember = (member) => {
    showConfirmationModal(
      'Remove Member',
      `Are you sure you want to remove ${member.name || 'this member'} from the group?`,
      'Remove Member',
      'destructive',
      () => kickMember(member.uid)
    );
  };

  const kickMember = async (memberId) => {
    if (!groupId || !user?.uid || !memberId) return;
    setBusyAction(memberId);
    setMessage('');
    try {
      await removeGroupMember(groupId, memberId, user.uid);
      setMessage('Member removed from group.');
      setMessageType('success');
      await loadGroup();
    } catch (error) {
      setMessage(error?.message || 'Unable to remove member.');
      setMessageType('error');
    } finally {
      setBusyAction(null);
    }
  };

  const showConfirmationModal = (title, description, confirmText, type, onConfirm) => {
    setModalConfig({ title, description, confirmText, type, onConfirm });
    setModalVisible(true);
  };

  const confirmRemoveGroup = () => {
    showConfirmationModal(
      'Delete Group',
      'Are you sure you want to delete this group? This action is permanent and cannot be undone.',
      'Delete Group',
      'destructive',
      removeGroup
    );
  };

  const removeGroup = async () => {
    if (!groupId || !user?.uid) return;
    setBusyAction('delete');
    setMessage('');
    try {
      await deleteGroup(groupId, user.uid);
      router.replace('/community');
    } catch (error) {
      setMessage(error?.message || 'Unable to delete this group.');
      setMessageType('error');
      setBusyAction(null);
    }
  };

  const confirmLeave = () => {
    showConfirmationModal(
      'Leave Group',
      'Are you sure you want to leave this group? You will lose access to member conversations.',
      'Leave Group',
      'warning',
      leave
    );
  };

  const leave = async () => {
    if (!groupId || !user?.uid || !group) return;
    setBusyAction('leave');
    setMessage('');
    try {
      await leaveGroup(group, user.uid);
      router.replace('/community');
    } catch (error) {
      setMessage(error?.message || 'Unable to leave this group.');
      setMessageType('error');
      setBusyAction(null);
    }
  };

  const isOwner = group?.ownerId === user?.uid;
  const isAdmin = isOwner || group?.adminIds?.includes(user?.uid);

  return (
    <ScreenShell
      title="Community Settings"
      subtitle={group ? group.name : 'Manage your preferences'}
      showBack
      scrollable
    >
      <View style={styles.container}>
        {/* Group Info Card */}
        {group && (
          <View style={styles.groupInfoCard}>
            <View style={styles.groupInfoLeft}>
              <View style={styles.groupAvatar}>
                <Ionicons name="people" size={24} color={colors.brand} />
              </View>
              <View style={styles.groupInfoBody}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMeta}>
                  {group.memberCount || 0} members · {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member'}
                </Text>
              </View>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Member'}
              </Text>
            </View>
          </View>
        )}

        {/* Privacy & Notifications */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-outline" size={18} color={colors.brand} />
            <Text style={styles.sectionTitle}>Privacy & Notifications</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Direct Messages</Text>
              <Text style={styles.settingDesc}>
                {dmPolicy === 'open' ? 'Anyone can message you' : 'Require approval for messages'}
              </Text>
            </View>
            <Switch
              value={dmPolicy === 'open'}
              onValueChange={(value) =>
                saveSettings(value ? 'open' : 'request', notificationsEnabled)
              }
              trackColor={{ false: colors.border, true: colors.brandGlow }}
              thumbColor={dmPolicy === 'open' ? colors.brand : colors.greyLight}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Community Notifications</Text>
              <Text style={styles.settingDesc}>
                {notificationsEnabled ? 'Notifications are enabled' : 'Notifications are muted'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(value) => saveSettings(dmPolicy, value)}
              trackColor={{ false: colors.border, true: colors.brandGlow }}
              thumbColor={notificationsEnabled ? colors.brand : colors.greyLight}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && styles.pressedOpacity]}
            onPress={() => saveSettings(dmPolicy, notificationsEnabled)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Group Management */}
        {isAdmin && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={18} color={colors.brand} />
              <Text style={styles.sectionTitle}>Group Management</Text>
            </View>

            {/* Status Feedback Message */}
            {message ? (
              <View
                style={[
                  styles.messageBox,
                  messageType === 'error' ? styles.messageError : styles.messageSuccess,
                ]}
              >
                <Ionicons
                  name={messageType === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={16}
                  color={messageType === 'error' ? '#EF4444' : '#10B981'}
                />
                <Text
                  style={[
                    styles.messageText,
                    { color: messageType === 'error' ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {message}
                </Text>
              </View>
            ) : null}

            {/* Members List */}
            <Text style={styles.sectionLabel}>Members</Text>
            {loadingGroup ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.brand} />
              </View>
            ) : members.length ? (
              members.map((member) => {
                const memberIsAdmin = group?.adminIds?.includes(member.uid);
                const isBusy = busyAction === member.uid;
                // Can kick if: (User is Owner) OR (User is Admin AND target is NOT an Admin)
                const canKick = isOwner || (!memberIsAdmin && isAdmin);

                return (
                  <View key={member.id || member.uid} style={styles.memberRow}>
                    <View style={styles.memberAvatar}>
                      <Ionicons name="person-circle-outline" size={36} color={colors.greyLight} />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{member.name || 'Member'}</Text>
                      <Text style={styles.memberMeta}>{member.email || 'Group member'}</Text>
                    </View>

                    {/* Member Controls */}
                    <View style={styles.memberActions}>
                      {isBusy ? (
                        <ActivityIndicator size="small" color={colors.brand} />
                      ) : (
                        <>
                          {/* Owner toggle for Admin role */}
                          {isOwner && (
                            <Pressable
                              style={({ pressed }) => [
                                memberIsAdmin ? styles.demoteButton : styles.adminButton,
                                pressed && styles.pressedOpacity,
                              ]}
                              onPress={() =>
                                memberIsAdmin ? confirmDemoteAdmin(member) : makeAdmin(member.uid)
                              }
                            >
                              <Text style={memberIsAdmin ? styles.demoteButtonText : styles.adminButtonText}>
                                {memberIsAdmin ? 'Demote' : 'Promote'}
                              </Text>
                            </Pressable>
                          )}

                          {/* Non-owner admins see a static status badge */}
                          {!isOwner && memberIsAdmin && (
                            <View style={styles.adminMemberTag}>
                              <Ionicons name="shield-checkmark" size={12} color={colors.brand} />
                              <Text style={styles.adminMemberTagText}>Admin</Text>
                            </View>
                          )}

                          {/* Remove Member Button */}
                          {canKick && (
                            <Pressable
                              style={({ pressed }) => [styles.kickButton, pressed && styles.pressedOpacity]}
                              onPress={() => confirmKickMember(member)}
                            >
                              <Ionicons name="person-remove-outline" size={16} color="#EF4444" />
                            </Pressable>
                          )}
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No additional members to manage yet.</Text>
            )}

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              {isOwner && (
                <Pressable
                  style={({ pressed }) => [styles.dangerButton, pressed && styles.pressedOpacity]}
                  onPress={confirmRemoveGroup}
                  disabled={busyAction === 'delete'}
                >
                  {busyAction === 'delete' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.dangerButtonText}>Delete Group</Text>
                    </>
                  )}
                </Pressable>
              )}

              {!isOwner && membership && (
                <Pressable
                  style={({ pressed }) => [styles.leaveButton, pressed && styles.pressedOpacity]}
                  onPress={confirmLeave}
                  disabled={busyAction === 'leave'}
                >
                  {busyAction === 'leave' ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="exit-outline" size={16} color="#EF4444" />
                      <Text style={styles.leaveButtonText}>Leave Group</Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Styled Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={[
                styles.modalIconContainer,
                modalConfig.type === 'destructive' ? styles.modalIconDestructive : styles.modalIconWarning,
              ]}
            >
              <Ionicons
                name={modalConfig.type === 'destructive' ? 'trash-outline' : 'warning-outline'}
                size={24}
                color={modalConfig.type === 'destructive' ? '#EF4444' : '#F59E0B'}
              />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalDescription}>{modalConfig.description}</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  modalConfig.type === 'destructive' ? styles.modalButtonDestructive : styles.modalButtonWarning,
                ]}
                onPress={() => {
                  setModalVisible(false);
                  modalConfig.onConfirm();
                }}
              >
                <Text style={styles.modalButtonConfirmText}>{modalConfig.confirmText}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenShell>
  );
}

const createStyles = (c, s, r) => ({
    container: {
      gap: s.lg || 16,
      paddingBottom: s['4xl'] || 32,
    },
    groupInfoCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderRadius: r.xl || 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: s.lg || 16,
    },
    groupInfoLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.md || 12,
      flex: 1,
    },
    groupAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.brandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupInfoBody: {
      flex: 1,
    },
    groupName: {
      fontSize: 15,
      fontWeight: '700',
      color: c.ink,
    },
    groupMeta: {
      fontSize: 12,
      color: c.grey,
      marginTop: 2,
    },
    roleBadge: {
      borderRadius: r.full || 999,
      backgroundColor: c.brandLight,
      paddingHorizontal: s.md || 12,
      paddingVertical: s.xs || 4,
    },
    roleBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.brandText,
      textTransform: 'uppercase',
    },
    sectionCard: {
      backgroundColor: c.surface,
      borderRadius: r.xl || 16,
      borderWidth: 1,
      borderColor: c.border,
      padding: s.lg || 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm || 8,
      marginBottom: s.lg || 16,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.ink,
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: s.md || 12,
      paddingVertical: s.sm || 8,
    },
    settingInfo: {
      flex: 1,
    },
    settingLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: c.ink,
    },
    settingDesc: {
      fontSize: 12,
      color: c.grey,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: c.borderLight,
      marginVertical: s.xs || 4,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm || 8,
      backgroundColor: c.brand,
      borderRadius: r.lg || 12,
      paddingVertical: s.md || 12,
      marginTop: s.md || 12,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.grey,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: s.sm || 8,
    },
    loadingRow: {
      paddingVertical: s.lg || 16,
      alignItems: 'center',
    },
    memberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm || 8,
      paddingVertical: s.sm || 8,
      borderTopWidth: 1,
      borderTopColor: c.borderLight,
    },
    memberAvatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    memberInfo: {
      flex: 1,
    },
    memberName: {
      fontSize: 13,
      fontWeight: '600',
      color: c.ink,
    },
    memberMeta: {
      fontSize: 11,
      color: c.grey,
      marginTop: 1,
    },
    memberActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.xs || 6,
    },
    adminButton: {
      backgroundColor: c.brand,
      borderRadius: r.full || 999,
      paddingHorizontal: s.md || 12,
      paddingVertical: (s.xs || 4) + 2,
    },
    adminButtonText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '700',
    },
    demoteButton: {
      backgroundColor: '#F59E0B15',
      borderRadius: r.full || 999,
      paddingHorizontal: s.md || 12,
      paddingVertical: (s.xs || 4) + 2,
      borderWidth: 1,
      borderColor: '#F59E0B30',
    },
    demoteButtonText: {
      color: '#D97706',
      fontSize: 11,
      fontWeight: '700',
    },
    kickButton: {
      backgroundColor: '#EF444415',
      borderRadius: r.full || 999,
      padding: 6,
    },
    adminMemberTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.brandLight,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: r.full || 999,
    },
    adminMemberTagText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.brandText,
    },
    emptyText: {
      color: c.grey,
      fontSize: 12.5,
      paddingVertical: s.sm || 8,
      textAlign: 'center',
    },
    messageBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: s.sm || 8,
      borderRadius: r.md || 8,
      paddingHorizontal: s.md || 12,
      paddingVertical: s.sm || 8,
      marginBottom: s.md || 12,
    },
    messageSuccess: {
      backgroundColor: '#10B98115',
    },
    messageError: {
      backgroundColor: '#EF444415',
    },
    messageText: {
      fontSize: 12.5,
      fontWeight: '600',
      flex: 1,
    },
    dangerZone: {
      marginTop: s.lg || 16,
      paddingTop: s.lg || 16,
      borderTopWidth: 1,
      borderTopColor: '#EF444430',
      gap: s.sm || 8,
    },
    dangerTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: '#EF4444',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    dangerButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm || 8,
      backgroundColor: '#EF4444',
      borderRadius: r.lg || 12,
      paddingVertical: s.md || 12,
    },
    dangerButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '700',
    },
    leaveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.sm || 8,
      backgroundColor: '#EF444415',
      borderRadius: r.lg || 12,
      borderWidth: 1,
      borderColor: '#EF444430',
      paddingVertical: s.md || 12,
    },
    leaveButtonText: {
      color: '#EF4444',
      fontSize: 14,
      fontWeight: '700',
    },
    pressedOpacity: {
      opacity: 0.8,
    },
    /* Modal Styles */
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: s.lg || 16,
    },
    modalContent: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: c.modalBackground,
      borderRadius: r.xl || 16,
      padding: s.xl || 20,
      alignItems: 'center',
    },
    modalIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: s.md || 12,
    },
    modalIconDestructive: {
      backgroundColor: '#EF444415',
    },
    modalIconWarning: {
      backgroundColor: '#F59E0B15',
    },
    modalTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: c.ink,
      marginBottom: s.xs || 4,
      textAlign: 'center',
    },
    modalDescription: {
      fontSize: 13,
      color: c.grey,
      textAlign: 'center',
      marginBottom: s.lg || 16,
    },
    modalActions: {
      flexDirection: 'row',
      gap: s.md || 12,
      width: '100%',
    },
    modalButton: {
      flex: 1,
      paddingVertical: s.md || 10,
      borderRadius: r.lg || 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalButtonCancel: {
      backgroundColor: c.canvasLight,
    },
    modalButtonCancelText: {
      color: c.ink,
      fontWeight: '600',
      fontSize: 14,
    },
    modalButtonDestructive: {
      backgroundColor: '#EF4444',
    },
    modalButtonWarning: {
      backgroundColor: '#F59E0B',
    },
    modalButtonConfirmText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
});
