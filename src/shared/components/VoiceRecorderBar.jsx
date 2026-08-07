import React, { memo, useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useAuth } from '../../../context/AuthContext';

const COLORS = {
  indigo: '#6366F1',
  indigoDark: '#4338CA',
  indigoSoft: '#EEF2FF',
  white: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#64748B',
  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  border: '#E7E9F4',
  surface: '#F8FAFC',
};

const SWIPE_TO_CANCEL_THRESHOLD = -80;
const WAVE_BARS = 5;

/**
 * Voice recorder bar that appears in the composer area.
 * Hold to record, release to send, swipe left to cancel.
 * Only renders for premium users. Shows upgrade prompt for free users.
 */
const VoiceRecorderBar = memo(({ conversationId, onVoiceSent }) => {
  const router = useRouter();
  const { profile } = useAuth();
  const isPremium = Boolean(profile?.premium && profile?.subscriptionStatus !== 'expired');
  const {
    isRecording,
    recordingDuration,
    isUploading,
    error,
    startRecording,
    cancelRecording,
    sendRecording,
    formatDuration,
    maxDurationMs,
  } = useAudioRecorder({ conversationId, isPremium });

  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const panX = useRef(new Animated.Value(0)).current;
  const isSwiping = useRef(false);
  const sendingRef = useRef(false);

  // Wave animation values
  const waveAnims = useRef(
    Array.from({ length: WAVE_BARS }, () => new Animated.Value(0.3))
  ).current;

  // Animate wave bars during recording
  useEffect(() => {
    if (!isRecording) {
      waveAnims.forEach((anim) => anim.setValue(0.3));
      return;
    }

    const animateWave = (index) => {
      const randomDuration = 200 + Math.random() * 400;
      const randomHeight = 0.4 + Math.random() * 0.6;
      Animated.sequence([
        Animated.timing(waveAnims[index], {
          toValue: randomHeight,
          duration: randomDuration,
          useNativeDriver: false,
        }),
        Animated.timing(waveAnims[index], {
          toValue: 0.3,
          duration: randomDuration * 0.7,
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (isRecording) animateWave(index);
      });
    };

    waveAnims.forEach((_, index) => animateWave(index));

    return () => {
      waveAnims.forEach((anim) => anim.stopAnimation());
    };
  }, [isRecording, waveAnims]);

  const finalizeAndSend = useCallback(async () => {
    if (sendingRef.current) return;

    sendingRef.current = true;
    setIsSending(true);
    try {
      const result = await sendRecording();
      if (result && onVoiceSent) {
        await onVoiceSent(result);
      }
    } finally {
      setIsSending(false);
      sendingRef.current = false;
    }
  }, [onVoiceSent, sendRecording]);

  useEffect(() => {
    if (!isRecording || recordingDuration < maxDurationMs || sendingRef.current) return;
    finalizeAndSend();
  }, [finalizeAndSend, isRecording, maxDurationMs, recordingDuration]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => isRecording,
      onMoveShouldSetPanResponder: () => isRecording && !sendingRef.current,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0 && !sendingRef.current) {
          panX.setValue(gesture.dx);
          isSwiping.current = Math.abs(gesture.dx) > 20;
          setIsCancelling(gesture.dx < SWIPE_TO_CANCEL_THRESHOLD / 2);
        }
      },
      onPanResponderRelease: async (_, gesture) => {
        if (!isRecording || sendingRef.current) return;

        if (gesture.dx < SWIPE_TO_CANCEL_THRESHOLD) {
          // Swipe left to cancel
          sendingRef.current = true;
          setIsCancelling(true);
          try {
            await cancelRecording();
          } finally {
            sendingRef.current = false;
          }
        } else {
          // Release to send
          await finalizeAndSend();
        }
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
        isSwiping.current = false;
        setIsCancelling(false);
      },
    }),
    [cancelRecording, finalizeAndSend, isRecording, panX]
  );

  const handleUpgrade = useCallback(() => {
    setShowUpgrade(false);
    router.push('/premium');
  }, [router]);

  const handlePressIn = useCallback(async () => {
    if (!isPremium) {
      setShowUpgrade(true);
      return;
    }
    if (sendingRef.current) return;
    sendingRef.current = true;
    try {
      await startRecording();
    } finally {
      sendingRef.current = false;
    }
  }, [isPremium, startRecording]);

  const durationMs = recordingDuration;
  const progress = maxDurationMs > 0 ? durationMs / maxDurationMs : 0;
  const maxReached = durationMs >= maxDurationMs;
  const seconds = Math.floor(durationMs / 1000);

  // If not premium, show a button that triggers upgrade prompt
  if (!isPremium) {
    return (
      <Pressable
        onPress={() => setShowUpgrade(true)}
        style={({ pressed }) => [
          styles.micButton,
          pressed && styles.micButtonPressed,
        ]}
      >
        <Ionicons name="mic-outline" size={20} color={COLORS.inkSoft} />
      </Pressable>
    );
  }

  return (
    <View style={styles.container}>
      {isRecording ? (
        <Animated.View
          style={[
            styles.recordingContainer,
            { transform: [{ translateX: panX }] },
            isCancelling && styles.recordingContainerCancelling,
          ]}
          {...panResponder.panHandlers}
        >
          {/* Cancel indicator */}
          <View style={[styles.cancelZone, isCancelling && styles.cancelZoneActive]}>
            <Ionicons
              name={isCancelling ? "close-circle" : "arrow-back"}
              size={18}
              color={isCancelling ? COLORS.white : COLORS.danger}
            />
            <Text style={[styles.cancelText, isCancelling && styles.cancelTextActive]}>
              {isCancelling ? 'Release to cancel' : 'Slide'}
            </Text>
          </View>

          {/* Recording visualization */}
          <View style={styles.recordingCenter}>
            {/* Waveform visualization */}
            <View style={styles.waveformRow}>
              <View style={[styles.recordingDot, maxReached && styles.recordingDotMax]} />
              {waveAnims.map((anim, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      height: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [4, 28],
                      }),
                      backgroundColor: maxReached ? '#DC2626' : COLORS.indigo,
                    },
                  ]}
                />
              ))}
            </View>

            {/* Timer and send hint */}
            <View style={styles.timerRow}>
              <Text style={[styles.recordingTimer, maxReached && styles.recordingTimerMax]}>
                {formatDuration(durationMs)}
              </Text>
              <Text style={styles.sendHint}>
                {seconds >= 1 ? '↑ Send' : ''}
              </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                  maxReached && styles.progressFillMax,
                ]}
              />
            </View>
          </View>

          {/* Send button */}
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
              isSending && styles.sendButtonSending,
            ]}
            onPress={async () => {
              await finalizeAndSend();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSending ? "hourglass-outline" : "arrow-up-circle"}
              size={24}
              color={COLORS.white}
            />
          </Pressable>
        </Animated.View>
      ) : isUploading ? (
        <View style={styles.uploadingContainer}>
          <View style={styles.uploadingSpinner}>
            <Ionicons name="sync-outline" size={16} color={COLORS.indigo} />
          </View>
          <Text style={styles.uploadingText}>Uploading voice...</Text>
        </View>
      ) : (
        <Pressable
          onPress={handlePressIn}
          style={({ pressed }) => [
            styles.micButton,
            pressed && styles.micButtonActive,
          ]}
        >
          <Ionicons name="mic" size={22} color={COLORS.indigo} />
        </Pressable>
      )}

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={12} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Modal visible={showUpgrade} transparent animationType="fade" onRequestClose={() => setShowUpgrade(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowUpgrade(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalIconWrap}>
            <Ionicons name="lock-closed" size={24} color="#B45309" />
          </View>
          <Text style={styles.modalTitle}>Premium Feature</Text>
          <Text style={styles.modalText}>
            Voice messages are available for Premium members only. Upgrade to send and receive voice messages.
          </Text>
          <Pressable style={styles.modalButton} onPress={handleUpgrade}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            <Text style={styles.modalButtonText}>Upgrade to Premium</Text>
          </Pressable>
          <Pressable style={styles.modalCancel} onPress={() => setShowUpgrade(false)}>
            <Text style={styles.modalCancelText}>Maybe later</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
});

VoiceRecorderBar.displayName = 'VoiceRecorderBar';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DDE3F5',
  },
  micButtonPressed: {
    backgroundColor: '#E0E7FF',
    opacity: 0.8,
  },
  micButtonActive: {
    backgroundColor: '#DDE3F5',
    transform: [{ scale: 0.95 }],
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 4,
    minWidth: 240,
    borderWidth: 1.5,
    borderColor: COLORS.indigoSoft,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  recordingContainerCancelling: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerSoft,
  },
  cancelZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 1,
    borderRadius: 16,
    minWidth: 44,
  },
  cancelZoneActive: {
    backgroundColor: COLORS.danger,
  },
  cancelText: {
    fontSize: 8,
    fontWeight: '700',
    color: COLORS.danger,
    textAlign: 'center',
  },
  cancelTextActive: {
    color: COLORS.white,
  },
  recordingCenter: {
    flex: 1,
    gap: 3,
    paddingHorizontal: 6,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 28,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginRight: 4,
  },
  recordingDotMax: {
    backgroundColor: '#DC2626',
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordingTimer: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.ink,
    fontVariant: ['tabular-nums'],
  },
  recordingTimerMax: {
    color: '#DC2626',
  },
  sendHint: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.inkSoft,
  },
  progressTrack: {
    width: '100%',
    height: 3,
    backgroundColor: '#E7E9F4',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.indigo,
    borderRadius: 2,
  },
  progressFillMax: {
    backgroundColor: '#DC2626',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.indigo,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  sendButtonPressed: {
    backgroundColor: COLORS.indigoDark,
    transform: [{ scale: 0.92 }],
  },
  sendButtonSending: {
    backgroundColor: COLORS.inkSoft,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  uploadingSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkSoft,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: -22,
    left: 0,
    right: 0,
  },
  errorText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
    alignItems: 'center',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E7E9F4',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366F1',
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
});

export default VoiceRecorderBar;
