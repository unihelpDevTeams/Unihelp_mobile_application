import { useState, useEffect, useRef, useCallback } from 'react';
import { checkUsernameAvailability } from '../signupService';

export function useUsernameCheck() {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | available | taken | error
  const [errorMessage, setErrorMessage] = useState('');
  const timerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const checkUsername = useCallback(async (value) => {
    if (!value || value.trim().length < 3) {
      setStatus('idle');
      setErrorMessage('');
      return;
    }

    setStatus('checking');
    try {
      const result = await checkUsernameAvailability(value.trim());
      if (mountedRef.current) {
        if (result.available) {
          setStatus('available');
          setErrorMessage('');
        } else {
          setStatus('taken');
          setErrorMessage(result.error || 'Username is already taken.');
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        setStatus('error');
        setErrorMessage(error?.message || 'Could not check username availability.');
      }
    }
  }, []);

  const onChangeUsername = useCallback(
    (value) => {
      setUsername(value);

      if (timerRef.current) clearTimeout(timerRef.current);

      if (!value || value.trim().length < 3) {
        setStatus('idle');
        setErrorMessage('');
        return;
      }

      timerRef.current = setTimeout(() => {
        checkUsername(value);
      }, 500);
    },
    [checkUsername]
  );

  const resetStatus = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  return {
    username,
    onChangeUsername,
    status,
    errorMessage,
    resetStatus,
  };
}
