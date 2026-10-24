import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useAudioRecorder } from '../hooks/useAudioRecorder';

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

const clamp = (value, min, max) =>
  Math.min(Math.max(Number(value) || 0, min), max);

/**
 * UniHelp Voice Recorder Bar
 *
 * Interaction:
 * 1. Tap the microphone to start recording.
 * 2. Tap the send button to send the recording.
 * 3. Swipe left across the recording surface to cancel.
 * 4. Recording automatically sends when the maximum duration is reached.
 *
 */
const VoiceRecorderBar = memo(
  ({
    conversationId,
    onVoiceSent,
    onStateChange,
    expanded = false,
  }) => {
    const { width: screenWidth } = useWindowDimensions();

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
    } = useAudioRecorder({
      conversationId,
    });

    const [isSending, setIsSending] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);
    const [actionError, setActionError] = useState('');

    const panX = useRef(new Animated.Value(0)).current;

    const sendingRef = useRef(false);
    const startingRef = useRef(false);
    const cancellingRef = useRef(false);
    const mountedRef = useRef(true);

    const onStateChangeRef = useRef(onStateChange);
    const onVoiceSentRef = useRef(onVoiceSent);

    const waveAnims = useRef(
      Array.from(
        { length: WAVE_BARS },
        () => new Animated.Value(0.3)
      )
    ).current;

    const waveLoopsRef = useRef([]);
    const gestureStartXRef = useRef(0);

    const recorderState =
      isUploading || isSending
        ? 'uploading'
        : isRecording
          ? 'recording'
          : 'idle';

    const durationMs = Math.max(
      0,
      Number(recordingDuration) || 0
    );

    const maximumDuration = Math.max(
      0,
      Number(maxDurationMs) || 0
    );

    const progress = maximumDuration > 0
      ? clamp(durationMs / maximumDuration, 0, 1)
      : 0;

    const maxReached =
      maximumDuration > 0 &&
      durationMs >= maximumDuration;

    const seconds = Math.floor(durationMs / 1000);

    const isBusy =
      isUploading ||
      isSending ||
      sendingRef.current ||
      startingRef.current ||
      cancellingRef.current;

    const availableWidth = Math.max(0, screenWidth - 32);

    /*
     * Keep the recording surface within the available width
     * so it cannot push the message composer off-screen.
     */
    const recorderWidth = expanded
      ? '100%'
      : Math.min(availableWidth, 440);

    /*
     * Keep callbacks up to date without repeatedly notifying
     * the parent every time an inline callback changes identity.
     */
    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);

    useEffect(() => {
      onVoiceSentRef.current = onVoiceSent;
    }, [onVoiceSent]);

    useEffect(() => {
      onStateChangeRef.current?.(recorderState);
    }, [recorderState]);

    useEffect(() => {
      mountedRef.current = true;

      return () => {
        mountedRef.current = false;

        onStateChangeRef.current?.('idle');

        waveLoopsRef.current.forEach((loop) => {
          loop.stop();
        });

        waveLoopsRef.current = [];

        waveAnims.forEach((anim) => {
          anim.stopAnimation();
        });

        panX.stopAnimation();
      };
    }, [waveAnims, panX]);

    /*
     * Waveform animation lifecycle.
     */
    const stopWaveAnimations = useCallback(() => {
      waveLoopsRef.current.forEach((loop) => {
        loop.stop();
      });

      waveLoopsRef.current = [];

      waveAnims.forEach((anim) => {
        anim.stopAnimation();
        anim.setValue(0.3);
      });
    }, [waveAnims]);

    useEffect(() => {
      if (!isRecording && !isUploading && !isSending) {
        stopWaveAnimations();
        return undefined;
      }

      const loops = waveAnims.map((anim) => {
        const randomDuration = 200 + Math.random() * 400;
        const randomHeight = 0.4 + Math.random() * 0.6;

        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: randomHeight,
              duration: randomDuration,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: randomDuration * 0.7,
              useNativeDriver: false,
            }),
          ])
        );

        return loop;
      });

      waveLoopsRef.current = loops;

      loops.forEach((loop) => loop.start());

      return () => {
        loops.forEach((loop) => loop.stop());

        waveLoopsRef.current = waveLoopsRef.current.filter(
          (loop) => !loops.includes(loop)
        );
      };
    }, [
      isRecording,
      isUploading,
      isSending,
      waveAnims,
      stopWaveAnimations,
    ]);

    /*
     * Reset the horizontal offset after each gesture.
     */
    const resetPan = useCallback(() => {
      Animated.spring(panX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 12,
      }).start();
    }, [panX]);

    /*
     * Start recording once per tap.
     */
    const handleStartRecording = useCallback(async () => {
      if (
        startingRef.current ||
        sendingRef.current ||
        cancellingRef.current ||
        isRecording ||
        isUploading
      ) {
        return;
      }

      startingRef.current = true;
      setActionError('');

      try {
        await startRecording();
      } catch (err) {
        if (mountedRef.current) {
          setActionError(
            err?.message || 'Unable to start recording. Please try again.'
          );
        }
      } finally {
        startingRef.current = false;
      }
    }, [
      isRecording,
      isUploading,
      startRecording,
    ]);

    /*
     * Send exactly once.
     *
     * Errors are surfaced in the UI instead of leaving an
     * unhandled promise rejection.
     */
    const finalizeAndSend = useCallback(async () => {
      if (
        sendingRef.current ||
        startingRef.current ||
        cancellingRef.current ||
        !isRecording
      ) {
        return;
      }

      sendingRef.current = true;

      if (mountedRef.current) {
        setIsSending(true);
        setActionError('');
      }

      try {
        const result = await sendRecording();

        if (result && onVoiceSentRef.current) {
          await onVoiceSentRef.current(result);
        }
      } catch (err) {
        if (mountedRef.current) {
          setActionError(
            err?.message || 'Failed to send voice message. Please try again.'
          );
        }
      } finally {
        sendingRef.current = false;

        if (mountedRef.current) {
          setIsSending(false);
        }

        resetPan();
      }
    }, [
      isRecording,
      sendRecording,
      resetPan,
    ]);

    /*
     * Cancel safely without allowing a simultaneous send.
     */
    const handleCancelRecording = useCallback(async () => {
      if (
        cancellingRef.current ||
        sendingRef.current ||
        startingRef.current ||
        !isRecording
      ) {
        return;
      }

      cancellingRef.current = true;

      if (mountedRef.current) {
        setIsCancelling(true);
        setActionError('');
      }

      try {
        await cancelRecording();
      } catch (err) {
        if (mountedRef.current) {
          setActionError(
            err?.message || 'Unable to cancel recording. Please try again.'
          );
        }
      } finally {
        cancellingRef.current = false;

        if (mountedRef.current) {
          setIsCancelling(false);
        }

        resetPan();
      }
    }, [
      isRecording,
      cancelRecording,
      resetPan,
    ]);

    /*
     * Auto-send at the recording duration limit.
     */
    useEffect(() => {
      if (
        !isRecording ||
        maximumDuration <= 0 ||
        durationMs < maximumDuration ||
        sendingRef.current ||
        cancellingRef.current
      ) {
        return;
      }

      finalizeAndSend();
    }, [
      isRecording,
      durationMs,
      maximumDuration,
      finalizeAndSend,
    ]);

    /*
     * Gesture handling:
     * - Only claim the gesture after a meaningful horizontal move.
     * - Let ordinary taps reach the send button.
     * - Cancel only when the user crosses the left threshold.
     * - Releasing without crossing the threshold does not auto-send;
     *   the explicit send button handles sending.
     */
    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => false,

          onMoveShouldSetPanResponder: (_, gesture) => {
            if (
              !isRecording ||
              sendingRef.current ||
              startingRef.current ||
              cancellingRef.current
            ) {
              return false;
            }

            const horizontal =
              Math.abs(gesture.dx) > 8;

            const mostlyHorizontal =
              Math.abs(gesture.dx) >
              Math.abs(gesture.dy) * 1.2;

            return horizontal && mostlyHorizontal;
          },

          onPanResponderGrant: () => {
            gestureStartXRef.current = 0;
          },

          onPanResponderMove: (_, gesture) => {
            if (
              sendingRef.current ||
              cancellingRef.current
            ) {
              return;
            }

            /*
             * Allow left movement only; slight rightward
             * movement returns the surface toward its origin.
             */
            const dx = Math.min(0, gesture.dx);

            panX.setValue(dx);

            const cancelling =
              dx <= SWIPE_TO_CANCEL_THRESHOLD;

            if (mountedRef.current) {
              setIsCancelling(cancelling);
            }
          },

          onPanResponderRelease: async (_, gesture) => {
            if (
              sendingRef.current ||
              cancellingRef.current
            ) {
              resetPan();
              return;
            }

            if (
              gesture.dx <= SWIPE_TO_CANCEL_THRESHOLD
            ) {
              await handleCancelRecording();
            } else {
              resetPan();

              if (mountedRef.current) {
                setIsCancelling(false);
              }
            }
          },

          onPanResponderTerminate: () => {
            resetPan();

            if (mountedRef.current) {
              setIsCancelling(false);
            }
          },

          onPanResponderTerminationRequest: () => false,

          onShouldBlockNativeResponder: () => false,
        }),
      [
        isRecording,
        panX,
        handleCancelRecording,
        resetPan,
      ]
    );

    const visibleError = actionError || error;

    return (
      <View
        style={[
          styles.container,
          expanded && styles.containerExpanded,
          !expanded && { maxWidth: recorderWidth },
        ]}
      >
        {isRecording ? (
          <Animated.View
            style={[
              styles.recordingContainer,
              {
                transform: [{ translateX: panX }],
              },
              isCancelling &&
                styles.recordingContainerCancelling,
            ]}
            {...panResponder.panHandlers}
          >
            {/* Swipe-to-cancel indicator */}
            <View
              style={[
                styles.cancelZone,
                isCancelling && styles.cancelZoneActive,
              ]}
              pointerEvents="none"
            >
              <Ionicons
                name={
                  isCancelling
                    ? 'close-circle'
                    : 'arrow-back'
                }
                size={18}
                color={
                  isCancelling
                    ? COLORS.white
                    : COLORS.danger
                }
              />

              <Text
                style={[
                  styles.cancelText,
                  isCancelling && styles.cancelTextActive,
                ]}
              >
                {isCancelling
                  ? 'Release to cancel'
                  : 'Slide'}
              </Text>
            </View>

            {/* Recording waveform and timer */}
            <View style={styles.recordingCenter}>
              <View style={styles.waveformRow}>
                <View
                  style={[
                    styles.recordingDot,
                    maxReached && styles.recordingDotMax,
                  ]}
                />

                {waveAnims.map((anim, index) => (
                  <Animated.View
                    key={`recording-wave-${index}`}
                    style={[
                      styles.waveBar,
                      {
                        height: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [4, 28],
                        }),
                        backgroundColor: maxReached
                          ? '#DC2626'
                          : COLORS.indigo,
                      },
                    ]}
                  />
                ))}
              </View>

              <View style={styles.timerRow}>
                <Text
                  style={[
                    styles.recordingTimer,
                    maxReached && styles.recordingTimerMax,
                  ]}
                >
                  {formatDuration(durationMs)}
                </Text>

                <Text style={styles.sendHint}>
                  {seconds >= 1 ? 'Tap ↑ to send' : 'Recording'}
                </Text>
              </View>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%` },
                    maxReached && styles.progressFillMax,
                  ]}
                />
              </View>
            </View>

            {/* Explicit send control */}
            <Pressable
              style={({ pressed }) => [
                styles.sendButton,
                pressed && styles.sendButtonPressed,
                (isSending || isUploading) &&
                  styles.sendButtonSending,
              ]}
              onPress={finalizeAndSend}
              disabled={
                isSending ||
                isUploading ||
                isCancelling
              }
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}
              accessibilityRole="button"
              accessibilityLabel="Send voice message"
              accessibilityState={{
                disabled:
                  isSending ||
                  isUploading ||
                  isCancelling,
              }}
            >
              {isSending || isUploading ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={23}
                  color={COLORS.white}
                />
              )}
            </Pressable>
          </Animated.View>
        ) : isUploading || isSending ? (
          <View
            style={[
              styles.uploadingContainer,
              expanded &&
                styles.uploadingContainerExpanded,
            ]}
          >
            <View style={styles.uploadingSpinner}>
              <ActivityIndicator
                size="small"
                color={COLORS.indigo}
              />
            </View>

            <View
              style={styles.uploadingWaveform}
              accessibilityLabel="Voice message waveform is loading"
            >
              {waveAnims.map((anim, index) => (
                <Animated.View
                  key={`upload-wave-${index}`}
                  style={[
                    styles.uploadingWaveBar,
                    {
                      transform: [{ scaleY: anim }],
                    },
                  ]}
                />
              ))}
            </View>

            <Text
              style={styles.uploadingText}
              numberOfLines={1}
            >
              {isUploading
                ? 'Uploading voice...'
                : 'Sending voice...'}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleStartRecording}
            disabled={isBusy}
            style={({ pressed }) => [
              styles.micButton,
              pressed && styles.micButtonActive,
              isBusy && styles.micButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Start recording voice message"
            accessibilityState={{
              disabled: isBusy,
            }}
          >
            <Ionicons
              name="mic"
              size={22}
              color={COLORS.indigo}
            />
          </Pressable>
        )}

        {visibleError ? (
          <View style={styles.errorBanner}>
            <Ionicons
              name="alert-circle"
              size={13}
              color={COLORS.danger}
            />

            <Text
              style={styles.errorText}
              numberOfLines={2}
            >
              {String(visibleError)}
            </Text>
          </View>
        ) : null}

      </View>
    );
  }
);

VoiceRecorderBar.displayName = 'VoiceRecorderBar';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    minWidth: 0,
    flexShrink: 1,
  },

  containerExpanded: {
    width: '100%',
    alignSelf: 'stretch',
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
    opacity: 0.85,
  },

  micButtonActive: {
    backgroundColor: '#DDE3F5',
    transform: [{ scale: 0.96 }],
  },

  micButtonDisabled: {
    opacity: 0.55,
  },

  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 5,
    minWidth: 0,
    width: '100%',
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
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 1,
    borderRadius: 16,
    minWidth: 40,
    flexShrink: 0,
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
    minWidth: 0,
    gap: 3,
    paddingHorizontal: 5,
  },

  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 28,
    minWidth: 0,
  },

  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginRight: 2,
    flexShrink: 0,
  },

  recordingDotMax: {
    backgroundColor: '#DC2626',
  },

  waveBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
    flexShrink: 0,
  },

  timerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
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
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.inkSoft,
    flexShrink: 1,
    textAlign: 'right',
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
    marginLeft: 3,
    flexShrink: 0,
  },

  sendButtonPressed: {
    backgroundColor: COLORS.indigoDark,
    transform: [{ scale: 0.94 }],
  },

  sendButtonSending: {
    backgroundColor: COLORS.inkSoft,
  },

  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 0,
  },

  uploadingContainerExpanded: {
    minHeight: 44,
    width: '100%',
    borderRadius: 22,
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.indigoSoft,
  },

  uploadingSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  uploadingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.inkSoft,
    flexShrink: 1,
  },

  uploadingWaveform: {
    flex: 1,
    minWidth: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 26,
  },

  uploadingWaveBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: COLORS.indigo,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 5,
    maxWidth: '100%',
  },

  errorText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '600',
  },

});

export default VoiceRecorderBar;