import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, saveUserProfile } from '../../services/firestoreSync';
import { deleteGroup, getGroup, leaveGroup, listGroupMembers, promoteGroupMemberToAdmin } from '../../src/shared/services/community';
import { colors, spacing, borderRadius, shadows } from '../../src/shared/theme';

export default function CommunitySettingsPage() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const { profile, user } = useAuth();
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

  useEffect(() => {
    if (!profile?.uid) return;
    getUserProfile(profile.uid).then((data) => {
      setNotificationsEnabled(data?.notificationsEnabled ?? true);
      setDmPolicy(data?.dmPolicy || 'open');
    }).catch(() => {});
  }, [profile?.uid]);

  useEffect(() => {
    const loadGroup = async () => {
      if (!groupId) {
        setLoadingGroup(false);
        return;
      }
      try {
        const [groupData, memberData] = await Promise.all([getGroup(groupId), listGroupMembers(groupId)]);
        setGroup(groupData);
        setMembers(memberData.filter((member) => member.uid !== groupData?.ownerId));
        const myMembership = memberData.find((m) => m.uid === profile?.uid);
        setMembership(myMembership || null);
      } finally {
        setLoadingGroup(false);
      }
    };
    loadGroup();
  }, [groupId]);

  const save = async (nextPolicy, nextNotifications) => {
    setSaving(true);
    try {
      await saveUserProfile({ dmPolicy: nextPolicy, notificationsEnabled: nextNotifications });
      setDmPolicy(nextPolicy);
      setNotificationsEnabled(nextNotifications);
    } finally {
      setSaving(false);
    }
  };

  const makeAdmin = async (memberId) => {
    if (!groupId || !user?.uid || !memberId) return;
    setBusyAction(memberId);
    setMessage('');
    try {
      await promoteGroupMemberToAdmin(groupId, memberId, user.uid);
      setMessage('Member promoted to admin successfully.');
      setMessageType('success');
      const refreshed = await listGroupMembers(groupId);
      setMembers(refreshed.filter((member) => member.uid !== group?.ownerId));
    } catch (error) {
      setMessage(error?.message || 'Unable to promote this member.');
      setMessageType('error');
    } finally {
      setBusyAction(null);
    }
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
            <View style={[styles.roleBadge, { backgroundColor: isOwner ? colors.amberLight : isAdmin ? colors.brandLight : colors.canvasLight }]}>
              <Text style={[styles.roleBadgeText, { color: isOwner ? colors.amber : isAdmin ? colors.brand : colors.grey }]}>
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
              onValueChange={(value) => save(value ? 'open' : 'request', notificationsEnabled)}
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
              onValueChange={(value) => save(dmPolicy, value)}
              trackColor={{ false: colors.border, true: colors.brandGlow }}
              thumbColor={notificationsEnabled ? colors.brand : colors.greyLight}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
            onPress={() => save(dmPolicy, notificationsEnabled)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color={colors.onBrand} />
                <Text style={styles.saveButtonText}>Save Settings</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Group Management (Admin only) */}
        {isAdmin && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings-outline" size={18} color={colors.purple} />
              <Text style={styles.sectionTitle}>Group Management</Text>
            </View>

            {/* Message */}
            {message ? (
              <View style={[styles.messageBox, messageType === 'error' ? styles.messageError : styles.messageSuccess]}>
                <Ionicons
                  name={messageType === 'error' ? 'alert-circle' : 'checkmark-circle'}
                  size={16}
                  color={messageType === 'error' ? colors.red : colors.green}
                />
                <Text style={[styles.messageText, { color: messageType === 'error' ? colors.red : colors.green }]}>
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
              members.map((member) => (
                <View key={member.id} style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Ionicons name="person-circle-outline" size={36} color={colors.greyLight} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name || 'Student'}</Text>
                    <Text style={styles.memberMeta}>{member.email || 'Group member'}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [styles.adminButton, pressed && styles.adminButtonPressed]}
                    onPress={() => makeAdmin(member.uid)}
                    disabled={busyAction === member.uid}
                  >
                    {busyAction === member.uid ? (
                      <ActivityIndicator size="small" color={colors.onBrand} />
                    ) : (
                      <Text style={styles.adminButtonText}>Promote</Text>
                    )}
                  </Pressable>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No additional members to manage yet.</Text>
            )}

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              {isOwner ? (
                <Pressable
                  style={({ pressed }) => [styles.dangerButton, pressed && styles.dangerButtonPressed]}
                  onPress={removeGroup}
                  disabled={busyAction === 'delete'}
                >
                  {busyAction === 'delete' ? (
                    <ActivityIndicator size="small" color={colors.onBrand} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={colors.onBrand} />
                      <Text style={styles.dangerButtonText}>Delete Group</Text>
                    </>
                  )}
                </Pressable>
              ) : null}

              {!isOwner && membership ? (
                <Pressable
                  style={({ pressed }) => [styles.leaveButton, pressed && styles.leaveButtonPressed]}
                  onPress={leave}
                  disabled={busyAction === 'leave'}
                >
                  {busyAction === 'leave' ? (
                    <ActivityIndicator size="small" color={colors.red} />
                  ) : (
                    <>
                      <Ionicons name="exit-outline" size={16} color={colors.red} />
                      <Text style={styles.leaveButtonText}>Leave Group</Text>
                    </>
                  )}
                </Pressable>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  groupInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  groupInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInfoBody: {
    flex: 1,
  },
  groupName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  groupMeta: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 2,
  },
  roleBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.ink,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.ink,
  },
  settingDesc: {
    fontSize: 12,
    color: colors.grey,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  saveButtonPressed: {
    backgroundColor: colors.brandDark,
  },
  saveButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.grey,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  loadingRow: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
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
    fontWeight: '700',
    color: colors.ink,
  },
  memberMeta: {
    fontSize: 11,
    color: colors.grey,
    marginTop: 1,
  },
  adminButton: {
    backgroundColor: colors.teal,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  adminButtonPressed: {
    opacity: 0.8,
  },
  adminButtonText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.grey,
    fontSize: 12.5,
    paddingVertical: spacing.sm,
    textAlign: 'center',
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  messageSuccess: {
    backgroundColor: colors.greenLight,
  },
  messageError: {
    backgroundColor: colors.redLight,
  },
  messageText: {
    fontSize: 12.5,
    fontWeight: '700',
    flex: 1,
  },
  dangerZone: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 2,
    borderTopColor: colors.redLight,
    gap: spacing.sm,
  },
  dangerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.red,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
  },
  dangerButtonPressed: {
    backgroundColor: colors.rose,
  },
  dangerButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.redLight,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    paddingVertical: spacing.md,
  },
  leaveButtonPressed: {
    backgroundColor: colors.redLight,
  },
  leaveButtonText: {
    color: colors.red,
    fontSize: 14,
    fontWeight: '800',
  },
});
