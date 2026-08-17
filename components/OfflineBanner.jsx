/**
 * OfflineBanner
 *
 * A subtle, non-intrusive banner that appears at the top of the screen
 * when the device has no internet connection.
 *
 * Does NOT appear during the brief initial period after app launch to
 * avoid false positives while NetInfo is still resolving.
 */

import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useNetwork } from "../context/NetworkContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function OfflineBanner() {
  const { isOnline } = useNetwork();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-60)).current;
  // Delay showing banner by 2 s after mount to avoid flash on app open
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    Animated.timing(translateY, {
      toValue: isOnline ? -60 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOnline, ready, translateY]);

  if (isOnline && !ready) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        { paddingTop: insets.top + 4, transform: [{ translateY }] },
      ]}
      pointerEvents="none"
    >
      <View style={styles.pill}>
        <View style={styles.dot} />
        <Text style={styles.text}>Offline mode • Some features unavailable</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingBottom: 8,
    backgroundColor: "rgba(0,0,0,0.82)",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
});
