import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@unihelp_conversation_appearance_v1';

// Conversation appearance is deliberately device-local. It changes only the
// current user's rendering and never exposes a preference to the other member.
export const getConversationAppearance = async (uid, conversationId) => {
  if (!uid || !conversationId) return null;
  try {
    const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}:${uid}:${conversationId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveConversationAppearance = async (uid, conversationId, appearance) => {
  if (!uid || !conversationId) throw new Error('Missing conversation appearance details.');
  await AsyncStorage.setItem(`${STORAGE_PREFIX}:${uid}:${conversationId}`, JSON.stringify(appearance));
};

export const clearConversationAppearance = async (uid, conversationId) => {
  if (!uid || !conversationId) return;
  await AsyncStorage.removeItem(`${STORAGE_PREFIX}:${uid}:${conversationId}`);
};
