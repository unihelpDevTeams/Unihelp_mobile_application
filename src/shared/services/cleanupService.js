import { collection, deleteDoc, doc, getDocs, orderBy, query, where, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { COLLECTIONS } from '../firestoreSchema';

const HOUR_MS = 60 * 60 * 1000;

/**
 * Delete document requests (notes/questions) that are older than 48 hours
 */
export async function cleanupExpiredRequests() {
  const cutoff = Timestamp.fromMillis(Date.now() - 48 * HOUR_MS);
  const collections = ['noteRequests', 'questionRequests'];

  let deleted = 0;
  for (const collectionName of collections) {
    try {
      const snapshot = await getDocs(
        query(collection(db, collectionName), where('createdAt', '<', cutoff))
      );
      const promises = snapshot.docs.map((d) => deleteDoc(doc(db, collectionName, d.id)));
      await Promise.all(promises);
      deleted += snapshot.size;
    } catch (error) {
      console.warn(`Cleanup error for ${collectionName}:`, error);
    }
  }
  return deleted;
}

/**
 * Delete group conversation messages older than 3 months.
 * Only targets conversations marked as group chats (or with memberCount > 2).
 */
export async function cleanupOldGroupMessages() {
  const cutoff = Timestamp.fromMillis(Date.now() - 90 * 24 * HOUR_MS); // ~3 months

  try {
    // Find group conversations (more than 2 members or explicitly typed as group)
    const conversationsSnap = await getDocs(collection(db, COLLECTIONS.conversations));
    const groupConversations = conversationsSnap.docs.filter((d) => {
      const data = d.data();
      const memberCount = data.memberIds?.length || data.memberCount || 0;
      return data.type === 'group' || memberCount > 2 || data.isGroup === true;
    });

    let deletedMessages = 0;
    for (const convDoc of groupConversations) {
      const messagesSnap = await getDocs(
        query(
          collection(db, COLLECTIONS.conversations, convDoc.id, 'messages'),
          where('createdAt', '<', cutoff),
          limit(500)
        )
      );
      const promises = messagesSnap.docs.map((m) => deleteDoc(doc(db, COLLECTIONS.conversations, convDoc.id, 'messages', m.id)));
      await Promise.all(promises);
      deletedMessages += messagesSnap.size;
    }
    return deletedMessages;
  } catch (error) {
    console.warn('Cleanup error for group messages:', error);
    return 0;
  }
}

/**
 * Run all cleanup tasks
 */
export async function runAllCleanup() {
  const [expiredDeleted, oldMessagesDeleted] = await Promise.all([
    cleanupExpiredRequests(),
    cleanupOldGroupMessages(),
  ]);
  return { expiredRequestsDeleted: expiredDeleted, oldGroupMessagesDeleted: oldMessagesDeleted };
}