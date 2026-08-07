/**
 * AI Context & Provider
 *
 * Central AI brain for the Unihelp app.
 * All AI operations go through the backend Express API.
 * The AI NEVER accesses Firestore directly from the mobile app.
 *
 * Provides:
 *   - Chat messaging with tool calling
 *   - Tool execution for embedded widgets
 *   - Server-side usage tracking
 *   - Widget state (tool results shown in page contexts)
 */

import React, { createContext, useCallback, useMemo, useState } from 'react';
import { sendChatMessage, executeAiTool, fetchAiUsage } from '../services/aiService';
import { useAuth } from '../../../context/AuthContext';

// Export the context so the useAI hook can import it
export const AIContext = createContext(null);

const initialMessages = [
  {
    role: 'assistant',
    text: 'Hi, I am Unihelp AI. Ask me for explanations, summaries, quizzes, or study plans.',
    time: new Date(),
  },
];

export function AIProvider({ children }) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [usageStatus, setUsageStatus] = useState(null);
  const [error, setError] = useState('');

  // Widget state - results from tool executions shown in context
  const [widgetResult, setWidgetResult] = useState(null);
  const [widgetLoading, setWidgetLoading] = useState(false);

  /* =========================================================
     Usage Tracking (server-side via Firestore)
  ========================================================= */

  const refreshUsage = useCallback(async () => {
    try {
      const status = await fetchAiUsage(profile);
      setUsageStatus(status);
      return status;
    } catch {
      const fallback = {
        used: 0,
        limit: profile?.premium ? 10 : 5,
        remaining: profile?.premium ? 10 : 5,
        allowed: true,
      };
      setUsageStatus(fallback);
      return fallback;
    }
  }, [profile]);

  /* =========================================================
     Send Chat Message (with tool calling)
  ========================================================= */

  const sendMessage = useCallback(async ({ prompt, attachment = null, context = {} }) => {
    if (!prompt?.trim() && !attachment) return '';
    setError('');
    setLoading(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: prompt?.trim() || (attachment ? `I attached ${attachment.name}` : ''),
      time: new Date(),
    };

    setMessages((current) => [...current, userMessage]);

    try {
      // Build history from current messages (last 10 for context)
      const history = messages.slice(-10).map((msg) => ({
        role: msg.role,
        text: msg.text,
      }));

      const result = await sendChatMessage({
        prompt: prompt?.trim() || '',
        profile,
        attachment,
        history,
      });

      // Update usage from server response
      if (result.usage) {
        setUsageStatus(result.usage);
      }

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.answer,
        time: new Date(),
        toolResults: result.toolResults || [],
      };

      setMessages((current) => [...current, assistantMessage]);
      return result.answer;
    } catch (sendError) {
      const message = sendError?.message || 'AI is unavailable right now.';
      setError(message);
      throw sendError;
    } finally {
      setLoading(false);
    }
  }, [profile, messages]);

  /* =========================================================
     Execute Tool (for AI widgets in pages)
  ========================================================= */

  const executeTool = useCallback(async ({ tool, input, context = {} }) => {
    setError('');
    setWidgetLoading(true);
    setWidgetResult(null);

    try {
      const result = await executeAiTool({
        tool,
        input,
        profile,
        context,
      });

      if (result.usage) {
        setUsageStatus(result.usage);
      }

      // Store result for widget display
      setWidgetResult({
        tool,
        summary: result.summary,
        items: result.items || [],
        recommendations: result.recommendations || [],
        toolResults: result.toolResults || [],
      });

      // Also add as a message for continuity
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.summary || `Here are the ${tool} results.`,
        time: new Date(),
        toolResults: result.toolResults || [],
        isWidget: true,
        widgetTool: tool,
      };

      setMessages((current) => [...current, assistantMessage]);
      return result;
    } catch (sendError) {
      const message = sendError?.message || 'AI tool request failed.';
      setError(message);
      setWidgetResult({ tool, summary: message, items: [], recommendations: [] });
      throw sendError;
    } finally {
      setWidgetLoading(false);
    }
  }, [profile]);

  /* =========================================================
     Reset
  ========================================================= */

  const resetMessages = useCallback(() => {
    setMessages([]);
    setError('');
    setWidgetResult(null);
  }, []);

  const clearWidgetResult = useCallback(() => {
    setWidgetResult(null);
  }, []);

  /* =========================================================
     Value
  ========================================================= */

  const value = useMemo(() => ({
    // Chat
    messages,
    loading,
    error,
    setMessages,
    sendMessage,
    resetMessages,

    // Tools & Widgets
    executeTool,
    widgetResult,
    widgetLoading,
    clearWidgetResult,

    // Usage
    usageStatus,
    refreshUsage,

    // Profile
    isPremium: Boolean(profile?.premium),
    profile,
  }), [
    messages, loading, error, sendMessage, resetMessages,
    executeTool, widgetResult, widgetLoading, clearWidgetResult,
    usageStatus, refreshUsage, profile,
  ]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

// Re-export the hook from the context for backward compatibility
export function useAI() {
  const context = React.useContext(AIContext);
  if (!context) throw new Error('useAI must be used within an AIProvider');
  return context;
}