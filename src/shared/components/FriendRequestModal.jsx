import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useThemeStyles } from '../theme/createStyles';

const personName = (person) => person?.name || person?.username || person?.email || 'Student';

export default function FriendRequestModal({ visible, person, onClose, onAdd }) {
  const { colors } = useTheme();
  const styles = useThemeStyles((c, s, r) => ({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', padding: s.lg },
    card: { backgroundColor: c.surface, borderRadius: r['2xl'], padding: s.lg, alignItems: 'center' },
    avatar: { width: 68, height: 68, borderRadius: 22, marginBottom: s.md },
    avatarFallback: { width: 68, height: 68, borderRadius: 22, marginBottom: s.md, backgroundColor: c.brandLight, alignItems: 'center', justifyContent: 'center' },
    avatarInitial: { color: c.brandDark, fontSize: 28, fontWeight: '900' },
    title: { color: c.textPrimary, fontSize: 18, fontWeight: '900', textAlign: 'center' },
    body: { color: c.textSecondary, fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: s.sm },
    error: { color: c.error, backgroundColor: c.dangerLight, borderRadius: r.md, padding: s.sm, marginTop: s.md, textAlign: 'center' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: s.sm, width: '100%', backgroundColor: c.brand, borderRadius: r.lg, paddingVertical: 13, marginTop: s.lg },
    addText: { color: c.onBrand, fontWeight: '800' },
    cancel: { paddingVertical: 12, marginTop: 4 },
    cancelText: { color: c.textSecondary, fontWeight: '700' },
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const name = personName(person);
  const imageUri = person?.avatar || person?.photo || person?.photoURL || '';

  const addFriend = async () => {
    setBusy(true);
    setError('');
    try {
      await onAdd?.();
      onClose?.();
    } catch (requestError) {
      setError(requestError?.message || 'Could not send the friend request.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.avatar} /> : <View style={styles.avatarFallback}><Text style={styles.avatarInitial}>{name[0]?.toUpperCase() || 'S'}</Text></View>}
          <Text style={styles.title}>Add {name} as a friend?</Text>
          <Text style={styles.body}>You need to become friends before you can chat freely. Send {name} a friend request to continue.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.addButton} onPress={addFriend} disabled={busy}>
            {busy ? <ActivityIndicator color={colors.onBrand} /> : <Ionicons name="person-add-outline" size={17} color={colors.onBrand} />}
            <Text style={styles.addText}>{busy ? 'Sending...' : 'Send friend request'}</Text>
          </Pressable>
          <Pressable style={styles.cancel} onPress={onClose} disabled={busy}>
            <Text style={styles.cancelText}>Not now</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
