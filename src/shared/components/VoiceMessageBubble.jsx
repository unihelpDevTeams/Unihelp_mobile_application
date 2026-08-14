import React, { memo, useCallback, useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { useAuth } from '../../../context/AuthContext';

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

const WAVE_BARS = 4;

/**
 * Voice message bubble component with waveform visualization.
 * Shows play/pause controls, animated waveform, progress bar, and remaining time.
 * Only premium users can play.
 */
const VoiceMessageBubble = memo(({ message, isMine, onLongPress }) => {
  const router = useRouter();
  const { profile } = useAuth();
  const isPremium = Boolean(profile?.premium && profile?.subscriptionStatus !== 'expired');
  const { isPlaying, isLoading, progress, remaining, duration, error, formatTime, play, pause, resume } =
    useAudioPlayback({ isPremium });

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

    const animateWave = (index) => {
      const randomDuration = 150 + Math.random() * 300;
      const randomHeight = 0.3 + Math.random() * 0.7;
      Animated.sequence([
        Animated.timing(waveAnims[index], {
          toValue: randomHeight,
          duration: randomDuration,
          useNativeDriver: false,
        }),
        Animated.timing(waveAnims[index], {
          toValue: 0.2,
          duration: randomDuration * 0.6,
          useNativeDriver: false,
        }),
      ]).start(() => {
        if (isPlaying) animateWave(index);
      });
    };

    waveAnims.forEach((_, index) => animateWave(index));

    return () => {
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
    if (!isPremium || !message?.audioUrl) return;

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
  }, [isPremium, message, isPlaying, isPaused, duration, pause, resume, play]);

  const handleUpgrade = useCallback(() => {
    router.push('/premium');
  }, [router]);

  const totalDurationMs = (message.duration || 0) * 1000;
  const displayTime = isPlaying || isPaused || remaining > 0
    ? formatTime(remaining)
    : formatTime(totalDurationMs);

  // If not premium, show upgrade prompt
  if (!isPremium) {
    return (
      <Pressable
        onPress={handleUpgrade}
        style={({ pressed }) => [
          styles.container,
          isMine ? styles.mine : styles.theirs,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.lockedRow}>
          <View style={styles.lockedIcon}>
            <Ionicons name="lock-closed" size={14} color={COLORS.inkSoft} />
          </View>
          <View style={styles.lockedTextContainer}>
            <Text style={styles.lockedText}>Voice messages are available for Premium members only.</Text>
            <Text style={styles.upgradeText}>Tap to upgrade →</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handlePlayPause}
      onLongPress={onLongPress}
      disabled={isLoading}
      style={({ pressed }) => [
        styles.container,
        isMine ? styles.mine : styles.theirs,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.controlsRow}>
          <View style={[styles.playButton, isMine && styles.playButtonMine]}>
            {isLoading ? (
              <ActivityIndicator color={isMine ? COLORS.white : COLORS.indigo} size="small" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause-fill' : (isPaused ? 'play' : 'play')}
                size={18}
                color={isMine ? COLORS.white : COLORS.indigo}
              />
            )}
          </View>

          {/* Waveform visualization */}
          <View style={styles.waveSection}>
            <View style={styles.waveformRow}>
              {isPlaying || isPaused ? (
                waveAnims.map((anim, index) => (
                  <Animated.View
                    key={index}
                    style={[
                      styles.waveBar,
                      {
                        height: anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [3, 20],
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
                  <View style={[styles.waveBar, styles.waveBarStatic, isMine && styles.waveBarStaticMine]} />
                  <View style={[styles.waveBar, styles.waveBarStatic, styles.waveBarStaticMd, isMine && styles.waveBarStaticMine]} />
                  <View style={[styles.waveBar, styles.waveBarStatic, styles.waveBarStaticLg, isMine && styles.waveBarStaticMine]} />
                  <View style={[styles.waveBar, styles.waveBarStatic, styles.waveBarStaticMd, isMine && styles.waveBarStaticMine]} />
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
    maxWidth: '82%',
    minWidth: '55%',
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.indigo,
    marginLeft: 48,
  },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 48,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    gap: 6,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    gap: 3,
    height: 20,
  },
  waveformStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 20,
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
    height: 3,
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
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTextContainer: {
    flex: 1,
  },
  lockedText: {
    fontSize: 12,
    color: COLORS.inkSoft,
    lineHeight: 16,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.indigo,
    marginTop: 2,
  },
});

export default VoiceMessageBubble;