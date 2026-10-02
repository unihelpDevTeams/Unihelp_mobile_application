import { useState, useRef, useCallback, useEffect } from 'react';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const finishedRef = useRef(false);
  const player = useAudioPlayer(null, { updateInterval: POLL_INTERVAL });
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    setIsLoaded(status.isLoaded);
    setIsPlaying(status.playing);

    if (status.isLoaded) {
      setIsLoading(false);
      setPosition(status.currentTime * 1000);
      setDuration(status.duration * 1000);
    }

    if (status.didJustFinish) {
      finishedRef.current = true;
      setPosition(status.duration * 1000);
    }
  }, [status.currentTime, status.didJustFinish, status.duration, status.isLoaded, status.playing]);

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
      setDuration(messageDuration || 0);

      await setAudioModeAsync({
        playsInSilentModeIOS: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      try {
        await player.stop();
      } catch (_stopError) {
        // Ignore stale-player cleanup issues; continue with the new source.
      }

      setPosition(0);
      player.replace({ uri: audioUrl });
      player.play();
    } catch (err) {
      console.error('[useAudioPlayback] Play failed:', err);
      setError('Failed to play voice message.');
    } finally {
      setIsLoading(false);
    }
  }, [isPremium, player]);

  const pause = useCallback(async () => {
    if (!isLoaded) return;
    try {
      player.pause();
      setIsPlaying(false);
    } catch (err) {
      console.error('[useAudioPlayback] Pause failed:', err);
    }
  }, [isLoaded, player]);

  const resume = useCallback(async () => {
    if (!isLoaded) return;
    try {
      if (finishedRef.current) {
        finishedRef.current = false;
        await player.seekTo(0);
      }
      player.play();
    } catch (err) {
      console.error('[useAudioPlayback] Resume failed:', err);
    }
  }, [isLoaded, player]);

  const seek = useCallback(async (millis) => {
    if (!isLoaded) return;
    try {
      finishedRef.current = false;
      await player.seekTo(millis / 1000);
      setPosition(millis);
    } catch (err) {
      console.error('[useAudioPlayback] Seek failed:', err);
    }
  }, [isLoaded, player]);

  const stop = useCallback(async () => {
    if (!isLoaded) return;
    try {
      player.pause();
      await player.seekTo(0);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
      finishedRef.current = false;
    } catch (err) {
      console.error('[useAudioPlayback] Stop failed:', err);
    }
  }, [isLoaded, player]);

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