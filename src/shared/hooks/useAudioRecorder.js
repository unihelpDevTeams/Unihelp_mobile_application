import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { getApiUrl } from '../services/backend';
import { auth } from '../../../firebase/config';

const MAX_RECORDING_DURATION_MS = 60 * 1000;
const MIN_RECORDING_DURATION_MS = 500;
const TARGET_BITRATE = 32000;

const RECORDING_OPTIONS = {
  android: {
    extension: '.m4a',
    outputFormat: Audio.AndroidOutputFormat.MPEG_4,
    audioEncoder: Audio.AndroidAudioEncoder.AAC,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: TARGET_BITRATE,
  },
  ios: {
    extension: '.m4a',
    outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
    audioQuality: Audio.IOSAudioQuality.MEDIUM,
    sampleRate: 44100,
    numberOfChannels: 1,
    bitRate: TARGET_BITRATE,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: TARGET_BITRATE },
};

const resetAudioMode = async () => {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch {
    // Best effort. A failed reset should not break the send flow.
  }
};

const stopAndUnloadRecorder = async (recorder) => {
  if (!recorder) return null;

  const stopMethod = recorder.stopAndUnloadAsync || recorder.stopAndUnloadRecording;
  if (typeof stopMethod !== 'function') {
    return null;
  }

  return stopMethod.call(recorder);
};

export function useAudioRecorder({ conversationId, isPremium }) {
  const [permission, setPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  const recordingRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const lastDurationRef = useRef(0);
  const stoppingRef = useRef(false);

  useEffect(() => {
    const getPermission = async () => {
      try {
        const { status } = await Audio.requestPermissionsAsync();
        setPermission(status === 'granted');
      } catch {
        setPermission(false);
      }
    };
    getPermission();
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimer();
      if (recordingRef.current) {
        stopAndUnloadRecorder(recordingRef.current).catch(() => {});
        recordingRef.current = null;
      }
      resetAudioMode();
    };
  }, [clearTimer]);

  const getSafeDuration = useCallback(() => {
    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    return Math.max(lastDurationRef.current, recordingDuration, elapsed);
  }, [recordingDuration]);

  const stopRecorderIfNeeded = useCallback(async (recorder) => {
    if (!recorder || stoppingRef.current) return null;

    stoppingRef.current = true;
    try {
      let status = null;
      try {
        status = await recorder.getStatusAsync();
      } catch {
        status = null;
      }

      if (status?.durationMillis) {
        lastDurationRef.current = status.durationMillis;
      }

      if (!status || status.canRecord || status.isRecording) {
        await stopAndUnloadRecorder(recorder);
      }

      return status;
    } finally {
      stoppingRef.current = false;
      await resetAudioMode();
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!isPremium) {
      setError('Voice messages are available for Premium members only.');
      return;
    }

    if (!permission) {
      Alert.alert('Microphone Permission', 'Microphone access is required to record voice messages.');
      return;
    }

    if (!conversationId) {
      setError('No active conversation.');
      return;
    }

    try {
      setError(null);
      clearTimer();

      if (recordingRef.current) {
        await stopAndUnloadRecorder(recordingRef.current).catch(() => {});
        const staleUri = recordingRef.current.getURI();
        if (staleUri) {
          await FileSystem.deleteAsync(staleUri, { idempotent: true }).catch(() => {});
        }
        recordingRef.current = null;
        await resetAudioMode();
      }

      lastDurationRef.current = 0;
      startTimeRef.current = Date.now();
      setRecordingDuration(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS,
        (status) => {
          if (!status.isRecording) return;
          const duration = Math.min(status.durationMillis || 0, MAX_RECORDING_DURATION_MS);
          lastDurationRef.current = duration;
          setRecordingDuration(duration);
        },
        100
      );

      recordingRef.current = recording;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const duration = Math.min(Date.now() - startTimeRef.current, MAX_RECORDING_DURATION_MS);
        lastDurationRef.current = duration;
        setRecordingDuration(duration);
      }, 100);
    } catch (err) {
      console.error('[useAudioRecorder] Start failed:', err);
      setError('Failed to start recording.');
      setIsRecording(false);
      await resetAudioMode();
    }
  }, [clearTimer, conversationId, isPremium, permission]);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;

    try {
      clearTimer();
      await stopRecorderIfNeeded(recordingRef.current);
      setIsRecording(false);
    } catch (err) {
      console.error('[useAudioRecorder] Stop failed:', err);
      await resetAudioMode();
    }
  }, [clearTimer, stopRecorderIfNeeded]);

  const cancelRecording = useCallback(async () => {
    const recorder = recordingRef.current;
    if (!recorder) return;

    try {
      clearTimer();
      await stopRecorderIfNeeded(recorder);
      const uri = recorder.getURI();

      if (uri) {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
      }
    } catch (err) {
      console.error('[useAudioRecorder] Cancel failed:', err);
    } finally {
      recordingRef.current = null;
      startTimeRef.current = 0;
      lastDurationRef.current = 0;
      setRecordingDuration(0);
      setIsRecording(false);
    }
  }, [clearTimer, stopRecorderIfNeeded]);

  const sendRecording = useCallback(async () => {
    const recorder = recordingRef.current;
    if (!recorder) return null;

    try {
      setIsUploading(true);
      setError(null);
      clearTimer();

      const status = await stopRecorderIfNeeded(recorder);
      setIsRecording(false);

      const uri = recorder.getURI();
      if (!uri) {
        throw new Error('No recording URI available.');
      }

      const durationMs = Math.min(
        Math.max(status?.durationMillis || 0, getSafeDuration()),
        MAX_RECORDING_DURATION_MS
      );

      if (durationMs < MIN_RECORDING_DURATION_MS) {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        recordingRef.current = null;
        startTimeRef.current = 0;
        lastDurationRef.current = 0;
        setRecordingDuration(0);
        setError('Hold the mic a little longer to record.');
        return null;
      }

      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('Recording file not found.');
      }

      const durationSec = Math.max(1, Math.round(durationMs / 1000));
      const token = await auth.currentUser?.getIdToken();

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/mp4',
        name: `voice_${Date.now()}.m4a`,
      });
      formData.append('conversationId', conversationId);
      formData.append('duration', String(durationSec));

      const response = await fetch(`${getApiUrl()}/api/voice/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed.');
      }

      await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});

      recordingRef.current = null;
      startTimeRef.current = 0;
      lastDurationRef.current = 0;
      setRecordingDuration(0);

      return {
        audioUrl: result.audioUrl,
        duration: result.duration || durationSec,
        uploadedBytes: result.bytes,
        publicId: result.publicId,
        cloudinaryPublicId: result.publicId,
      };
    } catch (err) {
      console.error('[useAudioRecorder] Upload failed:', err);
      setError(err.message || 'Failed to upload recording.');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [clearTimer, conversationId, getSafeDuration, stopRecorderIfNeeded]);

  const formatDuration = useCallback((ms) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    recordingDuration,
    isUploading,
    error,
    permission,
    startRecording,
    stopRecording,
    cancelRecording,
    sendRecording,
    formatDuration,
    maxDurationMs: MAX_RECORDING_DURATION_MS,
  };
}
