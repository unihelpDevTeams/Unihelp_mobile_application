import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

const POLL_INTERVAL = 200;

/**
 * Custom hook for voice message playback.
 * Lazy initializes - only creates player when first play is called.
 * Disposes resources after playback completes.
 *
 * @param {Object} options
 * @param {boolean} options.isPremium - Whether the user is premium
 * @returns {Object} Playback controls and state
 */
export function useAudioPlayback({ isPremium }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const soundRef = useRef(null);
  const positionRef = useRef(null);
  const finishedRef = useRef(false);
  const currentUrlRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (positionRef.current) clearInterval(positionRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  const startPositionPolling = useCallback(() => {
    if (positionRef.current) clearInterval(positionRef.current);
    positionRef.current = setInterval(async () => {
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            setPosition(status.positionMillis || 0);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              finishedRef.current = true;
              setPosition(status.durationMillis || 0);
              clearInterval(positionRef.current);
              positionRef.current = null;
            }
          }
        } catch {
          // Ignore polling errors
        }
      }
    }, POLL_INTERVAL);
  }, []);

  const play = useCallback(async (audioUrl, messageDuration) => {
    if (!isPremium) {
      setError('Voice messages are available for Premium members only.');
      return;
    }

    if (!audioUrl) {
      setError('No audio URL provided.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      finishedRef.current = false;
      currentUrlRef.current = audioUrl;

      // Unload previous sound if any
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded) {
            const actualDuration = status.durationMillis || messageDuration || 0;
            setDuration(actualDuration);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              finishedRef.current = true;
              setPosition(actualDuration);
              if (positionRef.current) {
                clearInterval(positionRef.current);
                positionRef.current = null;
              }
            }
          }
        }
      );

      soundRef.current = newSound;
      setSound(newSound);
      setIsLoaded(true);
      setIsPlaying(true);
      setPosition(0);
      setDuration(messageDuration || 0);

      startPositionPolling();
    } catch (err) {
      console.error('[useAudioPlayback] Play failed:', err);
      setError('Failed to play voice message.');
    } finally {
      setIsLoading(false);
    }
  }, [isPremium, startPositionPolling]);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      if (positionRef.current) {
        clearInterval(positionRef.current);
        positionRef.current = null;
      }
    } catch (err) {
      console.error('[useAudioPlayback] Pause failed:', err);
    }
  }, []);

  const resume = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      // If already finished, restart from beginning
      if (finishedRef.current) {
        finishedRef.current = false;
        await soundRef.current.replayAsync();
        setIsPlaying(true);
        startPositionPolling();
        return;
      }
      
      await soundRef.current.playAsync();
      setIsPlaying(true);
      startPositionPolling();
    } catch (err) {
      console.error('[useAudioPlayback] Resume failed:', err);
    }
  }, [startPositionPolling]);

  const seek = useCallback(async (millis) => {
    if (!soundRef.current) return;
    try {
      finishedRef.current = false;
      await soundRef.current.setPositionAsync(millis);
      setPosition(millis);
    } catch (err) {
      console.error('[useAudioPlayback] Seek failed:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      if (positionRef.current) clearInterval(positionRef.current);
      positionRef.current = null;
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setSound(null);
      setIsLoaded(false);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      finishedRef.current = false;
      currentUrlRef.current = null;
    } catch (err) {
      console.error('[useAudioPlayback] Stop failed:', err);
    }
  }, []);

  const formatTime = useCallback((millis) => {
    if (!millis || millis < 0) return '0:00';
    const totalSec = Math.floor(millis / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }, []);

  const progress = duration > 0 ? Math.min(position / duration, 1) : 0;
  const remaining = Math.max(0, duration - position);

  return {
    isPlaying,
    isLoaded,
    isLoading,
    position,
    duration,
    progress,
    remaining,
    error,
    play,
    pause,
    resume,
    stop,
    seek,
    formatTime,
  };
}