/**
 * NetworkContext
 *
 * Provides a lightweight, reactive isOnline flag throughout the app.
 * Uses @react-native-community/netinfo which is already in package.json.
 *
 * Usage:
 *   const { isOnline } = useNetwork();
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

const NetworkContext = createContext({ isOnline: true });

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true); // optimistic default

  useEffect(() => {
    // Fetch the current state immediately on mount
    NetInfo.fetch().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    // Subscribe to future changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return unsubscribe;
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline }}>
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
