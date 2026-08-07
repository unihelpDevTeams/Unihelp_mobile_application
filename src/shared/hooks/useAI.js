/**
 * useAI Hook
 *
 * Central hook for all AI interactions in the app.
 * Provides chat, tool execution, usage tracking, and widget state.
 *
 * Usage:
 *   const { sendMessage, executeTool, messages, loading, usageStatus } = useAI();
 */

import { useContext } from 'react';
import { AIContext } from '../context/AIContext';

/**
 * Hook for accessing AI functionality.
 * Must be used within an AIProvider.
 */
export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}

export default useAI;