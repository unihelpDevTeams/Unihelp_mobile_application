import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
};

const WAVE_BARS = 18;
const WAVE_PATTERN = [0.34, 0.56, 0.82, 0.46, 0.67, 0.94, 0.53, 0.72, 0.4, 0.88, 0.61, 0.76, 0.48, 0.96, 0.58, 0.37, 0.7, 0.45];

/**
 * Voice message bubble component with waveform visualization.
 * Shows play/pause controls, animated waveform, progress bar, and remaining time.
 */
const VoiceMessageBubble = memo(({ message, isMine, onLongPress, bubbleColor }) => {
  const { isPlaying, isLoading, position, progress, remaining, duration, error, formatTime, play, pause, resume } =
    useAudioPlayback();

  const [isPaused, setIsPaused] = useState(false);
  const waveAnims = useRef(
    Array.from({ length: WAVE_BARS }, () => new Animated.Value(0.2))
  ).current;

  // Animate wave bars during playback
  useEffect(() => {
    if (!isPlaying) {
      waveAnims.forEach((anim) => anim.setValue(0.2));
      return;
    }

    const waveLoops = waveAnims.map((anim, index) => {
      const randomDuration = 190 + (index % 5) * 55;
      const randomHeight = WAVE_PATTERN[index] || 0.55;
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(anim, {
          toValue: randomHeight,
          duration: randomDuration,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0.2,
          duration: randomDuration * 0.6,
          useNativeDriver: false,
        }),
      ]));
      loop.start();
      return loop;
    });

    return () => {
      waveLoops.forEach((loop) => loop.stop());
      waveAnims.forEach((anim) => anim.stopAnimation());
    };
  }, [isPlaying, waveAnims]);

  // Track whether playback just finished
  useEffect(() => {
    if (progress >= 1 && duration > 0) {
      setIsPaused(false);
    }
  }, [progress, duration]);

  // Listen for external pause (from another bubble starting)
  useEffect(() => {
    if (!isPlaying && !isLoading && duration > 0 && progress < 1 && progress > 0) {
      setIsPaused(true);
    } else if (isPlaying) {
      setIsPaused(false);
    }
  }, [duration, isLoading, isPlaying, progress]);

  const handlePlayPause = useCallback(() => {
    if (!message?.audioUrl) return;

    if (isPlaying) {
      pause();
      setIsPaused(true);
    } else if (isPaused && duration > 0) {
      resume();
      setIsPaused(false);
    } else {
      // Start fresh playback
      setIsPaused(false);
      play(message.audioUrl, (message.duration || 0) * 1000);
    }
  }, [message, isPlaying, isPaused, duration, pause, resume, play]);

  const totalDurationMs = (message.duration || 0) * 1000;
  const displayTime = isPlaying || isPaused || remaining > 0
    ? formatTime(remaining)
    : formatTime(totalDurationMs);
  const elapsedTime = formatTime(position);
  const statusLabel = isLoading ? 'Loading audio' : error ? 'Tap to retry' : isPlaying ? 'Playing now' : isPaused ? 'Paused' : 'Voice message';

  return (
    <Pressable
      onPress={handlePlayPause}
      onLongPress={onLongPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={isLoading ? 'Loading voice message' : isPlaying ? 'Pause voice message' : 'Play voice message'}
      accessibilityState={{ busy: isLoading, disabled: isLoading }}
      style={({ pressed }) => [
        styles.container,
        isMine ? styles.mine : styles.theirs,
        isMine && bubbleColor ? { backgroundColor: bubbleColor } : null,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={[styles.statusPill, isMine && styles.statusPillMine]}>
            <Ionicons name={isLoading ? 'cloud-download-outline' : isPlaying ? 'volume-high-outline' : 'mic-outline'} size={12} color={isMine ? COLORS.white : COLORS.indigoDark} />
            <Text style={[styles.statusText, isMine && styles.statusTextMine]}>{statusLabel}</Text>
          </View>
          <Text style={[styles.elapsedText, isMine && styles.elapsedTextMine]}>{isPlaying || isPaused ? elapsedTime : formatTime(totalDurationMs)}</Text>
        </View>
        <View style={styles.controlsRow}>
          <View style={[styles.playButton, isMine && styles.playButtonMine]}>
            {isLoading ? (
              <ActivityIndicator color={isMine ? COLORS.white : COLORS.indigo} size="small" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={18}
                color={isMine ? COLORS.white : COLORS.indigo}
              />
            )}
          </View>

          {/* Waveform visualization */}
          <View style={styles.waveSection}>
            <View style={styles.waveformRow}>
              {isLoading ? (
                <View style={styles.loadingWaveform}>
                  <ActivityIndicator size="small" color={isMine ? COLORS.white : COLORS.indigo} />
                  <Text style={[styles.loadingText, isMine && styles.loadingTextMine]}>Loading audio…</Text>
                </View>
              ) : isPlaying || isPaused ? (
                waveAnims.map((anim, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveBar,
                      {
                        height: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [4, 26],
                        }),
                        backgroundColor: isMine
                          ? 'rgba(255,255,255,0.7)'
                          : COLORS.indigo,
                        opacity: isPlaying ? 1 : 0.4,
                      },
                    ]}
                  />
                ))
              ) : (
                <View style={styles.waveformStatic}>
                  {WAVE_PATTERN.map((height, index) => <View key={index} style={[styles.waveBar, styles.waveBarStatic, { height: 4 + height * 22 }, isMine && styles.waveBarStaticMine]} />)}
                </View>
              )}
            </View>

            {/* Progress bar */}
            <View style={[styles.progressTrack, isMine && styles.progressTrackMine]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                  isMine && styles.progressFillMine,
                ]}
              />
              {progress > 0 && progress < 1 ? <View style={[styles.progressDot, { left: `${Math.min(progress * 100, 100)}%` }, isMine && styles.progressDotMine]} /> : null}
            </View>
          </View>

          <Text style={[styles.time, isMine && styles.timeMine]}>
            {displayTime}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons
            name={isPlaying ? "volume-high" : (isPaused ? "pause-circle-outline" : "musical-note")}
            size={11}
            color={isMine ? 'rgba(255,255,255,0.65)' : COLORS.inkSoft}
          />
          <Text style={[styles.metaText, isMine && styles.metaTextMine]}>
            {isPlaying ? 'Playing' : (isPaused ? 'Paused' : 'Voice Message')}
            {!isPlaying && !isPaused && message.duration ? ` · ${Math.floor(message.duration / 60)}:${(message.duration % 60).toString().padStart(2, '0')}` : ''}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={12} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </Pressable>
  );
});

VoiceMessageBubble.displayName = 'VoiceMessageBubble';

const styles = StyleSheet.create({
  container: {
    borderRadius: 22,
    padding: 12,
    marginBottom: 10,
    width: '78%',
    maxWidth: '88%',
    minWidth: 235,
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
  pressed: {
    opacity: 0.85,
  },
  content: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: COLORS.indigoSoft,
  },
  statusPillMine: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  statusText: {
    color: COLORS.indigoDark,
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextMine: {
    color: COLORS.white,
  },
  elapsedText: {
    color: COLORS.inkSoft,
    fontSize: 10.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  elapsedTextMine: {
    color: 'rgba(255,255,255,0.72)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  waveSection: {
    flex: 1,
    gap: 4,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 26,
  },
  waveformStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 26,
  },
  loadingWaveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
  },
  loadingText: {
    color: COLORS.indigoDark,
    fontSize: 11,
    fontWeight: '700',
  },
  loadingTextMine: {
    color: COLORS.white,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  waveBarStatic: {
    backgroundColor: COLORS.border,
    height: 8,
    opacity: 0.6,
  },
  waveBarStaticMd: {
    height: 14,
  },
  waveBarStaticLg: {
    height: 18,
  },
  waveBarStaticMine: {
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressTrackMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.indigo,
    borderRadius: 2,
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
    minWidth: 36,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  timeMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: COLORS.inkSoft,
  },
  metaTextMine: {
    color: 'rgba(255,255,255,0.65)',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(239,68,68,0.3)',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    flex: 1,
  },
});

export default VoiceMessageBubble;
