import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Animated,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayback } from '../hooks/useAudioPlayback';

const COLORS = {
  indigo: '#6366F1',
  indigoDark: '#4338CA',
  indigoSoft: '#EEF2FF',
  white: '#FFFFFF',
  ink: '#0F172A',
  inkSoft: '#64748B',
  border: '#E7E9F4',
  surface: '#F8FAFC',
  error: '#EF4444',
};

const WAVE_PATTERN = [
  0.34, 0.56, 0.82, 0.46, 0.67, 0.94,
  0.53, 0.72, 0.4, 0.88, 0.61, 0.76,
  0.48, 0.96, 0.58, 0.37, 0.7, 0.45,
];

const WAVE_BARS = WAVE_PATTERN.length;

const clamp = (value, min, max) =>
  Math.min(Math.max(Number(value) || 0, min), max);

const formatDuration = (milliseconds) => {
  const totalSeconds = Math.max(
    0,
    Math.floor((Number(milliseconds) || 0) / 1000)
  );

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

/**
 * UniHelp voice message bubble.
 *
 * Supports:
 * - Incoming and outgoing messages
 * - Audio playback, pause, resume and retry
 * - Animated waveform and progress indicator
 * - Custom bubble fill, shape, density, width and font size
 * - Float, pop, shimmer and aurora-border animations
 *
 * The useAudioPlayback hook remains responsible for actual audio playback.
 */
const VoiceMessageBubble = memo(
  ({
    message,
    isMine = false,
    onLongPress,
    bubbleAppearance,
    bubbleFill,
    bubbleShape,
    bubbleMotion,
  }) => {
    const {
      isPlaying,
      isLoading,
      position,
      progress,
      remaining,
      duration,
      error,
      formatTime,
      play,
      pause,
      resume,
    } = useAudioPlayback();

    const { width: screenWidth } = useWindowDimensions();

    const [isPaused, setIsPaused] = useState(false);

    const waveAnims = useRef(
      Array.from(
        { length: WAVE_BARS },
        () => new Animated.Value(0.2)
      )
    ).current;

    const waveLoopsRef = useRef([]);
    const mountedRef = useRef(true);

    const audioUrl = message?.audioUrl;

    const messageDurationMs = Math.max(
      0,
      Number(message?.duration) || 0
    ) * 1000;

    const safeProgress = clamp(progress, 0, 1);

    const safePosition = Math.max(
      0,
      Number(position) || 0
    );

    const safeRemaining = Math.max(
      0,
      Number(remaining) || 0
    );

    const safeDuration = Math.max(
      0,
      Number(duration) || 0
    );

    const totalDurationMs =
      safeDuration || messageDurationMs;

    const compact =
      isMine &&
      bubbleAppearance?.density === 'compact';

    const fontScale = isMine
      ? clamp(
          (Number(bubbleAppearance?.fontSize) || 15.5) /
            15.5,
          0.8,
          1.4
        )
      : 1;

    const fill = bubbleFill || {
      color: COLORS.indigo,
    };

    const animation = isMine
      ? bubbleAppearance?.animation || 'none'
      : 'none';

    /*
     * Fix: do not force a minimum bubble width larger than the
     * available chat width. This prevents horizontal overflow.
     */
    const bubbleWidth = useMemo(() => {
      const availableWidth = Math.max(0, screenWidth - 32);

      const preferredWidth = isMine
        ? bubbleAppearance?.width === 'compact'
          ? availableWidth * 0.68
          : bubbleAppearance?.width === 'wide'
            ? availableWidth * 0.9
            : availableWidth * 0.78
        : availableWidth * 0.78;

      return Math.min(
        preferredWidth,
        availableWidth * 0.92
      );
    }, [
      screenWidth,
      isMine,
      bubbleAppearance?.width,
    ]);

    const translateY = bubbleMotion?.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, -3, 0],
      extrapolate: 'clamp',
    });

    const popScale = bubbleMotion?.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [1, 1.025, 1],
      extrapolate: 'clamp',
    });

    const shimmerX = bubbleMotion?.interpolate({
      inputRange: [0, 1],
      outputRange: [-150, 230],
      extrapolate: 'clamp',
    });

    const auroraBorder = bubbleMotion?.interpolate({
      inputRange: [0, 0.33, 0.66, 1],
      outputRange: [
        '#00D2FF',
        '#7F00FF',
        '#FF4D9D',
        '#00D2FF',
      ],
      extrapolate: 'clamp',
    });

    const displayTime = useMemo(() => {
      if (isPlaying || isPaused) {
        return formatTime(safeRemaining);
      }

      if (safeProgress > 0 && safeProgress < 1) {
        return formatTime(
          Math.max(0, totalDurationMs - safePosition)
        );
      }

      return formatTime(totalDurationMs);
    }, [
      isPlaying,
      isPaused,
      safeRemaining,
      safeProgress,
      safePosition,
      totalDurationMs,
      formatTime,
    ]);

    const statusLabel = isLoading
      ? 'Loading audio'
      : error
        ? 'Tap to retry'
        : isPlaying
          ? 'Playing now'
          : isPaused
            ? 'Paused'
            : 'Voice message';

    /*
     * Stop any running animation loops before restarting them.
     * This prevents duplicate animations when playback changes.
     */
    const stopWaveAnimations = useCallback(() => {
      waveLoopsRef.current.forEach((loop) => {
        loop.stop();
      });

      waveLoopsRef.current = [];

      waveAnims.forEach((anim) => {
        anim.stopAnimation();
        anim.setValue(0.2);
      });
    }, [waveAnims]);

    useEffect(() => {
      mountedRef.current = true;

      return () => {
        mountedRef.current = false;

        waveLoopsRef.current.forEach((loop) => {
          loop.stop();
        });

        waveLoopsRef.current = [];

        waveAnims.forEach((anim) => {
          anim.stopAnimation();
        });
      };
    }, [waveAnims]);

    /*
     * Animate the waveform only while audio is playing.
     * Native driver is disabled because height is animated.
     */
    useEffect(() => {
      if (!isPlaying) {
        stopWaveAnimations();
        return undefined;
      }

      waveLoopsRef.current.forEach((loop) => {
        loop.stop();
      });

      waveLoopsRef.current = [];

      const loops = waveAnims.map((anim, index) => {
        const baseDuration = 190 + (index % 5) * 55;
        const targetHeight = WAVE_PATTERN[index] || 0.55;

        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: targetHeight,
              duration: baseDuration,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: 0.2,
              duration: baseDuration * 0.6,
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
    }, [isPlaying, waveAnims, stopWaveAnimations]);

    /*
     * Synchronize the local pause state with playback state.
     */
    useEffect(() => {
      if (isPlaying) {
        setIsPaused(false);
        return;
      }

      if (
        !isLoading &&
        safeDuration > 0 &&
        safeProgress > 0 &&
        safeProgress < 1
      ) {
        setIsPaused(true);
      }

      if (safeProgress >= 1 && safeDuration > 0) {
        setIsPaused(false);
      }
    }, [
      isPlaying,
      isLoading,
      safeDuration,
      safeProgress,
    ]);

    const handlePlayPause = useCallback(() => {
      if (!audioUrl || isLoading) {
        return;
      }

      if (isPlaying) {
        pause();
        setIsPaused(true);
        return;
      }

      if (isPaused && safeDuration > 0) {
        resume();
        setIsPaused(false);
        return;
      }

      /*
       * Starting again after completion or an error asks the
       * playback hook to start the audio from the beginning.
       */
      setIsPaused(false);

      play(audioUrl, messageDurationMs);
    }, [
      audioUrl,
      isLoading,
      isPlaying,
      isPaused,
      safeDuration,
      messageDurationMs,
      pause,
      resume,
      play,
    ]);

    const backgroundColor = isMine
      ? fill.color || COLORS.indigo
      : COLORS.white;

    const playButtonColor = isMine
      ? COLORS.white
      : COLORS.indigo;

    const waveformColor = isMine
      ? 'rgba(255,255,255,0.78)'
      : COLORS.indigo;

    const staticWaveColor = isMine
      ? 'rgba(255,255,255,0.48)'
      : COLORS.border;

    const containerStyles = [
      styles.container,
      isMine ? styles.mine : styles.theirs,
      {
        width: bubbleWidth,
        maxWidth: '100%',
        padding: compact ? 9 : 12,
        backgroundColor: isMine && fill.gradient
          ? 'transparent'
          : backgroundColor,
        ...(isMine && bubbleShape
          ? bubbleShape
          : {}),
      },
      isMine && fill.gradient
        ? styles.transparentBackground
        : null,
      animation === 'aurora-border'
        ? styles.auroraContainer
        : null,
    ];

    return (
      <Animated.View
        style={[
          styles.outerContainer,
          {
            alignSelf: isMine
              ? 'flex-end'
              : 'flex-start',
            width: bubbleWidth,
          },
          animation === 'float' && translateY
            ? {
                transform: [{ translateY }],
              }
            : null,
          animation === 'pop' && popScale
            ? {
                transform: [{ scale: popScale }],
              }
            : null,
          animation === 'aurora-border'
            ? {
                padding: 2,
                borderRadius: 24,
                backgroundColor: COLORS.indigo,
                borderColor: auroraBorder,
                borderWidth: 1,
              }
            : null,
        ]}
      >
        <Pressable
          onPress={handlePlayPause}
          onLongPress={onLongPress}
          disabled={isLoading || !audioUrl}
          accessibilityRole="button"
          accessibilityLabel={
            isLoading
              ? 'Loading voice message'
              : isPlaying
                ? 'Pause voice message'
                : isPaused
                  ? 'Resume voice message'
                  : 'Play voice message'
          }
          accessibilityState={{
            busy: isLoading,
            disabled: isLoading || !audioUrl,
          }}
          style={({ pressed }) => [
            ...containerStyles,
            pressed && !isLoading
              ? styles.pressed
              : null,
          ]}
        >
          {isMine && fill.gradient ? (
            <LinearGradient
              colors={fill.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          ) : null}

          {animation === 'shimmer' && shimmerX ? (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.shimmerContainer,
                {
                  transform: [{ translateX: shimmerX }],
                },
              ]}
            >
              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(255,255,255,0.32)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.shimmerGradient}
              />
            </Animated.View>
          ) : null}

          <View
            style={[
              styles.content,
              compact && styles.compactContent,
            ]}
          >
            {/* Status and elapsed time */}
            <View style={styles.headerRow}>
              <View
                style={[
                  styles.statusPill,
                  isMine && styles.statusPillMine,
                ]}
              >
                <Ionicons
                  name={
                    isLoading
                      ? 'cloud-download-outline'
                      : isPlaying
                        ? 'volume-high-outline'
                        : error
                          ? 'alert-circle-outline'
                          : 'mic-outline'
                  }
                  size={12}
                  color={
                    isMine
                      ? COLORS.white
                      : COLORS.indigoDark
                  }
                />

                <Text
                  numberOfLines={1}
                  style={[
                    styles.statusText,
                    isMine && styles.statusTextMine,
                    {
                      fontSize: 10 * fontScale,
                    },
                  ]}
                >
                  {statusLabel}
                </Text>
              </View>

              <Text
                style={[
                  styles.elapsedText,
                  isMine && styles.elapsedTextMine,
                  {
                    fontSize: 10.5 * fontScale,
                  },
                ]}
              >
                {isPlaying || isPaused
                  ? formatTime(safePosition)
                  : formatTime(totalDurationMs)}
              </Text>
            </View>

            {/* Playback controls and waveform */}
            <View style={styles.controlsRow}>
              <View
                style={[
                  styles.playButton,
                  compact && styles.playButtonCompact,
                  isMine && styles.playButtonMine,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator
                    color={playButtonColor}
                    size="small"
                  />
                ) : (
                  <Ionicons
                    name={
                      isPlaying
                        ? 'pause'
                        : 'play'
                    }
                    size={compact ? 16 : 19}
                    color={playButtonColor}
                    style={
                      !isPlaying
                        ? styles.playIcon
                        : undefined
                    }
                  />
                )}
              </View>

              <View style={styles.waveSection}>
                <View style={styles.waveformRow}>
                  {isLoading ? (
                    <View style={styles.loadingWaveform}>
                      <ActivityIndicator
                        size="small"
                        color={waveformColor}
                      />

                      <Text
                        numberOfLines={1}
                        style={[
                          styles.loadingText,
                          isMine &&
                            styles.loadingTextMine,
                          {
                            fontSize: 11 * fontScale,
                          },
                        ]}
                      >
                        Loading…
                      </Text>
                    </View>
                  ) : (
                    waveAnims.map((anim, index) => (
                      <Animated.View
                        key={`wave-${index}`}
                        style={[
                          styles.waveBar,
                          compact &&
                            styles.waveBarCompact,
                          {
                            height: anim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [4, 26],
                            }),
                            backgroundColor: waveformColor,
                            opacity: isPlaying
                              ? 1
                              : isPaused
                                ? 0.65
                                : 0.9,
                          },
                        ]}
                      />
                    ))
                  )}
                </View>

                {/* Playback progress */}
                <View
                  style={[
                    styles.progressTrack,
                    isMine &&
                      styles.progressTrackMine,
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${safeProgress * 100}%`,
                      },
                      isMine &&
                        styles.progressFillMine,
                    ]}
                  />

                  {safeProgress > 0 &&
                  safeProgress < 1 ? (
                    <View
                      style={[
                        styles.progressDot,
                        {
                          left: `${safeProgress * 100}%`,
                        },
                        isMine &&
                          styles.progressDotMine,
                      ]}
                    />
                  ) : null}
                </View>
              </View>

              <Text
                numberOfLines={1}
                style={[
                  styles.time,
                  isMine && styles.timeMine,
                  {
                    fontSize: 11 * fontScale,
                  },
                ]}
              >
                {displayTime}
              </Text>
            </View>

            {/* Message metadata */}
            <View style={styles.metaRow}>
              <Ionicons
                name={
                  isPlaying
                    ? 'volume-high'
                    : isPaused
                      ? 'pause-circle-outline'
                      : 'musical-note'
                }
                size={11}
                color={
                  isMine
                    ? 'rgba(255,255,255,0.7)'
                    : COLORS.inkSoft
                }
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.metaText,
                  isMine && styles.metaTextMine,
                  {
                    fontSize: 11 * fontScale,
                  },
                ]}
              >
                {isPlaying
                  ? 'Playing'
                  : isPaused
                    ? 'Paused'
                    : 'Voice message'}
                {message?.duration
                  ? ` · ${formatDuration(
                      message.duration * 1000
                    )}`
                  : ''}
              </Text>
            </View>
          </View>

          {/* Error state */}
          {error ? (
            <View style={styles.errorRow}>
              <Ionicons
                name="alert-circle"
                size={13}
                color={COLORS.error}
              />

              <Text
                style={styles.errorText}
                numberOfLines={2}
              >
                {String(error)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  }
);

VoiceMessageBubble.displayName = 'VoiceMessageBubble';

const styles = StyleSheet.create({
  outerContainer: {
    marginBottom: 10,
    flexShrink: 1,
    minWidth: 0,
  },

  container: {
    position: 'relative',
    borderRadius: 22,
    padding: 12,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
  },

  mine: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.indigo,
  },

  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  transparentBackground: {
    backgroundColor: 'transparent',
  },

  auroraContainer: {
    borderWidth: 1,
    borderColor: COLORS.indigo,
  },

  pressed: {
    opacity: 0.88,
  },

  content: {
    gap: 8,
    minWidth: 0,
  },

  compactContent: {
    gap: 5,
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minWidth: 0,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.indigoSoft,
    flexShrink: 1,
    minWidth: 0,
  },

  statusPillMine: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  statusText: {
    color: COLORS.indigoDark,
    fontSize: 10,
    fontWeight: '800',
    flexShrink: 1,
  },

  statusTextMine: {
    color: COLORS.white,
  },

  elapsedText: {
    color: COLORS.inkSoft,
    fontSize: 10.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },

  elapsedTextMine: {
    color: 'rgba(255,255,255,0.78)',
  },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },

  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  playButtonCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  playButtonMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  playIcon: {
    marginLeft: 2,
  },

  waveSection: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },

  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
    height: 26,
    minWidth: 0,
    overflow: 'hidden',
  },

  waveBar: {
    width: 3,
    minWidth: 2,
    flexShrink: 1,
    borderRadius: 2,
  },

  waveBarCompact: {
    width: 2,
    minWidth: 1,
  },

  loadingWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    flexShrink: 1,
    minWidth: 0,
  },

  loadingText: {
    color: COLORS.indigoDark,
    fontSize: 11,
    fontWeight: '700',
    flexShrink: 1,
  },

  loadingTextMine: {
    color: COLORS.white,
  },

  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.09)',
    borderRadius: 2,
    overflow: 'visible',
    position: 'relative',
  },

  progressTrackMine: {
    backgroundColor: 'rgba(255,255,255,0.23)',
  },

  progressFill: {
    height: '100%',
    backgroundColor: COLORS.indigo,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFillMine: {
    backgroundColor: COLORS.white,
  },

  progressDot: {
    position: 'absolute',
    top: -3,
    width: 10,
    height: 10,
    marginLeft: -5,
    borderRadius: 5,
    backgroundColor: COLORS.indigo,
  },

  progressDotMine: {
    backgroundColor: COLORS.white,
  },

  time: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.inkSoft,
    minWidth: 34,
    maxWidth: 45,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    flexShrink: 0,
  },

  timeMine: {
    color: 'rgba(255,255,255,0.82)',
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 0,
  },

  metaText: {
    fontSize: 11,
    color: COLORS.inkSoft,
    flexShrink: 1,
  },

  metaTextMine: {
    color: 'rgba(255,255,255,0.72)',
  },

  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 7,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(239,68,68,0.35)',
  },

  errorText: {
    fontSize: 11,
    color: COLORS.error,
    flex: 1,
    flexShrink: 1,
  },

  shimmerContainer: {
    overflow: 'hidden',
  },

  shimmerGradient: {
    width: 100,
    height: '100%',
  },
});

export default VoiceMessageBubble;