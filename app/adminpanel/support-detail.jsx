import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ScreenShell from '../../src/shared/components/ScreenShell';
import { useAuth } from '../../context/AuthContext';
import {
  fetchSupportItem,
  updateSupportItemStatus,
  addAdminNote,
  fetchAdminNotes,
} from '../../src/shared/services/support';

const STATUS_OPTIONS = [
  { label: 'Pending', value: 'pending', icon: 'time-outline' },
  { label: 'In Progress', value: 'in_progress', icon: 'sync-outline' },
  { label: 'Resolved', value: 'resolved', icon: 'checkmark-circle-outline' },
  { label: 'Closed', value: 'closed', icon: 'lock-closed-outline' },
];

const STATUS_COLORS = {
  pending: { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
  in_progress: { bg: '#DBEAFE', text: '#1E40AF', dot: '#2563EB' },
  resolved: { bg: '#D1FAE5', text: '#065F46', dot: '#059669' },
  closed: { bg: '#F3F4F6', text: '#4B5563', dot: '#6B7280' },
};

const formatStatus = (status) => {
  return (status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function SupportDetailPage() {
  const { profile } = useAuth();
  const params = useLocalSearchParams();
  const { collection, id, tab } = params;

  const [item, setItem] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = profile?.admin === true;

  const loadData = useCallback(async () => {
    if (!collection || !id) return;
    try {
      setLoading(true);
      setError('');
      const [fetchedItem, fetchedNotes] = await Promise.all([
        fetchSupportItem(collection, id),
        fetchAdminNotes(collection, id),
      ]);
      setItem(fetchedItem);
      setNotes(fetchedNotes);
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load details.');
    } finally {
      setLoading(false);
    }
  }, [collection, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (newStatus) => {
    if (!collection || !id || updatingStatus) return;
    try {
      setUpdatingStatus(true);
      await updateSupportItemStatus(collection, id, newStatus);
      setItem((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (statusError) {
      Alert.alert('Error', statusError?.message || 'Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || !collection || !id || submittingNote) return;
    try {
      setSubmittingNote(true);
      const newNote = await addAdminNote(collection, id, noteText.trim());
      setNotes((prev) => [...prev, newNote]);
      setNoteText('');
    } catch (noteError) {
      Alert.alert('Error', noteError?.message || 'Failed to add note.');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!isAdmin) {
    return (
      <ScreenShell title="Access Restricted" showBack>
        <View style={styles.restricted}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#64748B" />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedText}>
            You need admin privileges to view this page.
          </Text>
        </View>
      </ScreenShell>
    );
  }

  if (loading) {
    return (
      <ScreenShell title="Loading..." showBack>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </ScreenShell>
    );
  }

  if (error || !item) {
    return (
      <ScreenShell title="Error" showBack>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
          <Text style={styles.errorText}>{error || 'Item not found.'}</Text>
          <Pressable style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const statusColors = STATUS_COLORS[item.status] || STATUS_COLORS.pending;

  return (
    <ScreenShell title="Support Detail" subtitle={item.subject || item.title || 'Viewing item'} showBack scrollable>
      <View style={styles.content}>
        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.currentStatus, { backgroundColor: statusColors.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColors.dot }]} />
              <Text style={[styles.currentStatusText, { color: statusColors.text }]}>
                {formatStatus(item.status)}
              </Text>
            </View>
            {updatingStatus && <ActivityIndicator size="small" color="#6366F1" />}
          </View>
          <View style={styles.statusOptions}>
            {STATUS_OPTIONS.map((option) => {
              const active = item.status === option.value;
              const colors = STATUS_COLORS[option.value];
              return (
                <Pressable
                  key={option.value}
                  style={[
                    styles.statusOption,
                    active && { backgroundColor: colors.bg, borderColor: colors.dot },
                  ]}
                  onPress={() => handleStatusChange(option.value)}
                  disabled={active || updatingStatus}
                >
                  <Ionicons
                    name={option.icon}
                    size={16}
                    color={active ? colors.text : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      active && { color: colors.text, fontWeight: '800' },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.detailsCard}>
            {item.name ? (
              <DetailRow label="Name" value={item.name} />
            ) : null}
            {item.email ? (
              <DetailRow label="Email" value={item.email} />
            ) : null}
            {item.phone ? (
              <DetailRow label="Phone" value={item.phone} />
            ) : null}
            {item.displayName ? (
              <DetailRow label="Display Name" value={item.displayName} />
            ) : null}
            {item.userId ? (
              <DetailRow label="User ID" value={item.userId} mono />
            ) : null}
            {item.reportType ? (
              <DetailRow
                label="Report Type"
                value={item.reportType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              />
            ) : null}
            {item.category ? (
              <DetailRow
                label="Category"
                value={item.category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              />
            ) : null}
            {item.subject ? (
              <DetailRow label="Subject" value={item.subject} />
            ) : null}
            {item.title ? (
              <DetailRow label="Title" value={item.title} />
            ) : null}
            <DetailRow label="Submitted" value={formatDate(item.createdAt)} />
            <DetailRow label="Last Updated" value={formatDate(item.updatedAt)} />
          </View>
        </View>

        {/* Message / Description Section */}
        {item.message || item.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {item.message ? 'Message' : 'Description'}
            </Text>
            <View style={styles.messageCard}>
              <Text style={styles.messageText}>
                {item.message || item.description}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Admin Notes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Admin Notes</Text>
          <View style={styles.notesCard}>
            {notes.length === 0 ? (
              <Text style={styles.noNotes}>No notes yet. Add the first note below.</Text>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={styles.noteItem}>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteAuthor}>{note.adminName}</Text>
                    <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
                  </View>
                  <Text style={styles.noteText}>{note.note}</Text>
                </View>
              ))
            )}
          </View>

          {/* Add Note Input */}
          <View style={styles.addNoteRow}>
            <TextInput
              placeholder="Add an internal note..."
              placeholderTextColor="#94A3B8"
              style={styles.noteInput}
              value={noteText}
              onChangeText={setNoteText}
              multiline
              maxLength={1000}
            />
            <Pressable
              style={({ pressed }) => [
                styles.addNoteButton,
                (!noteText.trim() || submittingNote) && styles.addNoteButtonDisabled,
                pressed && noteText.trim() && !submittingNote && styles.addNoteButtonPressed,
              ]}
              onPress={handleAddNote}
              disabled={!noteText.trim() || submittingNote}
            >
              {submittingNote ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text
        style={[styles.detailValue, mono && styles.detailValueMono]}
        selectable
        numberOfLines={3}
      >
        {value || 'N/A'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  restricted: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  restrictedTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  restrictedText: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B91C1C',
  },
  content: {
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  currentStatusText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  statusOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    width: 100,
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  detailValueMono: {
    fontFamily: 'monospace',
    fontSize: 11,
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
  },
  messageText: {
    fontSize: 14,
    color: '#0F172A',
    lineHeight: 22,
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 12,
  },
  noNotes: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  noteItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noteAuthor: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },
  noteDate: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
  noteText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  addNoteRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    maxHeight: 100,
  },
  addNoteButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNoteButtonDisabled: {
    backgroundColor: '#A5B4FC',
    opacity: 0.7,
  },
  addNoteButtonPressed: {
    backgroundColor: '#3730A3',
  },
});