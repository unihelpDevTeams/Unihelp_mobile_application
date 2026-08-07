import AsyncStorage from '@react-native-async-storage/async-storage';
import { postJson } from './backend';

const AI_USAGE_PREFIX = '@unihelp_ai_usage';
const DAILY_AI_LIMITS = {
  free: 5,
  premium: 10,
};

const getUsageKey = (profile = {}) => {
  const uid = profile?.uid || profile?.id || 'guest';
  return `${AI_USAGE_PREFIX}:${uid}`;
};

const getTodayKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const getAiUsageLimit = (profile = {}) => (profile?.premium ? DAILY_AI_LIMITS.premium : DAILY_AI_LIMITS.free);

export const getAiUsageStatus = async (profile = {}) => {
  const key = `${getUsageKey(profile)}:${getTodayKey()}`;

  try {
    const raw = await AsyncStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    const used = Number(value?.used || 0);
    const limit = getAiUsageLimit(profile);

    return {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      allowed: used < limit,
    };
  } catch {
    const limit = getAiUsageLimit(profile);
    return { used: 0, limit, remaining: limit, allowed: true };
  }
};

export const consumeAiUsage = async (profile = {}) => {
  const key = `${getUsageKey(profile)}:${getTodayKey()}`;

  try {
    const raw = await AsyncStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    const used = Number(value?.used || 0);
    const limit = getAiUsageLimit(profile);

    if (used >= limit) {
      return { used, limit, remaining: 0, allowed: false };
    }

    const nextUsed = used + 1;
    await AsyncStorage.setItem(key, JSON.stringify({ used: nextUsed, updatedAt: new Date().toISOString() }));

    return {
      used: nextUsed,
      limit,
      remaining: Math.max(0, limit - nextUsed),
      allowed: true,
    };
  } catch {
    const limit = getAiUsageLimit(profile);
    return { used: 1, limit, remaining: Math.max(0, limit - 1), allowed: true };
  }
};

export const createAiContextPayload = (profile = {}, extra = {}) => ({
  profile: {
    uid: profile?.uid || profile?.id || '',
    username: profile?.username || profile?.displayName || '',
    role: profile?.role || 'student',
    premium: Boolean(profile?.premium),
  },
  ...extra,
});

export async function askStudyAi({ prompt, profile, attachment, context = {} }) {
  const usage = await consumeAiUsage(profile);
  if (!usage.allowed) {
    const limit = usage.limit;
    const detail = profile?.premium
      ? 'Premium users get 10 AI messages per day.'
      : 'Free users get 5 AI messages per day.';

    throw new Error(`You have reached your AI limit for today (${limit}/${limit}). ${detail}`);
  }

  const response = await postJson('/api/ai/study', {
    prompt,
    attachment,
    ...createAiContextPayload(profile, context),
  });

  return response.answer || '';
}

export async function askAiTool({ tool, input, profile, context = {} }) {
  const usage = await consumeAiUsage(profile);
  if (!usage.allowed) {
    throw new Error('You have reached your AI limit for today.');
  }

  const response = await postJson('/api/ai/tool', {
    tool,
    input,
    ...createAiContextPayload(profile, context),
  });

  return response;
}
