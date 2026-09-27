// src/utils/errorLogger.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_LOGS = 50;
const LOGS_STORAGE_KEY = '@unihelp_admin_error_logs';

let memoryLogs = [];

/**
 * Log an error globally and persist it for admin viewing.
 */
export async function logError(source, error, details = {}) {
  try {
    const errorObj = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      source,
      message: error?.message || String(error),
      code: error?.code || 'unknown',
      details: JSON.stringify(details),
    };
    
    // Add to memory, keep only max logs
    memoryLogs = [errorObj, ...memoryLogs].slice(0, MAX_LOGS);
    
    // Persist
    await AsyncStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(memoryLogs));
    console.error(`[ErrorLogger - ${source}]`, error, details);
  } catch (e) {
    console.warn('Failed to log error to storage', e);
  }
}

/**
 * Retrieve the saved logs
 */
export async function getErrorLogs() {
  try {
    const logs = await AsyncStorage.getItem(LOGS_STORAGE_KEY);
    if (logs) {
      memoryLogs = JSON.parse(logs);
      return memoryLogs;
    }
    return memoryLogs;
  } catch (e) {
    return [];
  }
}

/**
 * Clear all logs
 */
export async function clearErrorLogs() {
  memoryLogs = [];
  await AsyncStorage.removeItem(LOGS_STORAGE_KEY);
}

/**
 * Translate messy Firebase/API errors into user-friendly ones
 */
export function translateError(error) {
  if (!error) return 'An unknown error occurred.';
  
  const code = error?.code || '';
  const message = error?.message || String(error);
  
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) {
    return 'Incorrect email or password. Please try again.';
  }
  if (code.includes('auth/user-not-found')) {
    return 'No account found with that email address.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'An account already exists with this email.';
  }
  if (code.includes('auth/invalid-email') || message.includes('auth/invalid-email')) {
    return 'That email address doesn\'t look right.';
  }
  if (code.includes('network-request-failed')) {
    return 'Network error. Please check your internet connection.';
  }
  if (message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }
  
  // If it's a raw Firebase message like "Firebase: Error (auth/invalid-email)."
  if (message.startsWith('Firebase:')) {
    return 'Something went wrong. Please try again.';
  }

  return message;
}
