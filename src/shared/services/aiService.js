/**
 * AI Service Layer
 *
 * All AI requests go through the backend Express API.
 * The mobile app NEVER accesses Firestore directly for AI operations.
 *
 * Endpoints:
 *   POST /api/ai/chat   - Unified chat with tool calling
 *   POST /api/ai/study  - Simple study query (legacy)
 *   POST /api/ai/tool   - Specific tool execution (for widgets)
 *   GET  /api/ai/usage  - Check usage status
 */

import { postJson } from './backend';

/* =========================================================
   Chat - Unified endpoint
========================================================= */

export async function sendChatMessage({ prompt, profile, attachment = null, history = [] }) {
  const response = await postJson('/api/ai/chat', {
    prompt,
    profile: {
      uid: profile?.uid || profile?.id || '',
      username: profile?.username || profile?.displayName || '',
      role: profile?.role || 'student',
      premium: Boolean(profile?.premium),
    },
    attachment,
    history,
  });

  return {
    answer: response.answer || '',
    toolResults: response.toolResults || [],
    usage: response.usage || null,
  };
}

/* =========================================================
   Tool - For AI widgets embedded in pages
========================================================= */

export async function executeAiTool({ tool, input, profile, context = {} }) {
  const response = await postJson('/api/ai/tool', {
    tool,
    input,
    profile: {
      uid: profile?.uid || profile?.id || '',
      username: profile?.username || profile?.displayName || '',
      role: profile?.role || 'student',
      premium: Boolean(profile?.premium),
    },
    context,
  });

  return {
    summary: response.summary || '',
    items: response.items || [],
    recommendations: response.recommendations || [],
    toolResults: response.toolResults || [],
    usage: response.usage || null,
  };
}

/* =========================================================
   Usage - Check current AI usage status
========================================================= */

export async function fetchAiUsage(profile = {}) {
  try {
    // POST usage check with profile info
    const response = await postJson('/api/ai/usage', {
      profile: {
        uid: profile?.uid || profile?.id || '',
        premium: Boolean(profile?.premium),
      },
    });
    return response.usage || null;
  } catch {
    // Fallback if endpoint fails
    return {
      used: 0,
      limit: profile?.premium ? 10 : 5,
      remaining: profile?.premium ? 10 : 5,
      allowed: true,
    };
  }
}
