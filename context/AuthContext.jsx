import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseAuthProfile,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../firebase/config";
import { ensureCurrentUserProfile } from "../src/shared/services/firestore";
import { doc, setDoc } from "firebase/firestore";

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Profile cache helpers — keep only slim fields to avoid AsyncStorage limits
// ---------------------------------------------------------------------------
const PROFILE_CACHE_KEY = "@unihelp_cached_profile_v1";

async function persistProfileCache(profile) {
  try {
    if (!profile) {
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    } else {
      const slim = {
        uid: profile.uid,
        username: profile.username,
        email: profile.email,
        role: profile.role,
        photo: profile.photo,
        premium: profile.premium,
        usernameLower: profile.usernameLower,
      };
      await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(slim));
    }
  } catch {
    // Non-fatal
  }
}

async function readProfileCache(uid) {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
    const profile = raw ? JSON.parse(raw) : null;
    return profile?.uid === uid ? profile : null;
  } catch {
    return null;
  }
}

/**
 * Wraps ensureCurrentUserProfile with a timeout so startup is never blocked
 * indefinitely when the device is offline.  Falls back to the cached profile.
 */
async function ensureProfileWithFallback(options = {}, cachedProfile = null, timeoutMs = 8000) {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("Profile fetch timed out — device may be offline")),
        timeoutMs
      )
    );
    return await Promise.race([ensureCurrentUserProfile(options), timeoutPromise]);
  } catch (err) {
    console.log("[AuthContext] Profile fetch failed, using cache:", err?.message);
    if (cachedProfile) return cachedProfile;
    if (auth.currentUser) {
      // Minimal skeleton so the app can render while offline.
      return {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        username: auth.currentUser.displayName || "",
        photo: auth.currentUser.photoURL || "",
        role: "university",
        premium: false,
        _offline: true,
      };
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Step 1: read local cache immediately so the rest of the app can render
        const cachedProfile = await readProfileCache(firebaseUser.uid);

        // Step 2: unblock loading with whatever we have locally
        setUser(firebaseUser);
        setProfile(cachedProfile);
        setLoading(false);

        // Step 3: fetch fresh profile in background (non-blocking)
        const provider =
          firebaseUser.providerData?.[0]?.providerId === "google.com" ? "google" : "email";
        const freshProfile = await ensureProfileWithFallback({ provider }, cachedProfile);
        if (freshProfile) {
          setProfile(freshProfile);
          persistProfileCache(freshProfile);
        }
      } else {
        setUser(null);
        setProfile(null);
        persistProfileCache(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);

    if (!credential.user.emailVerified) {
      try {
        await import("firebase/auth").then((m) => m.sendEmailVerification(credential.user));
      } catch (e) {
        console.error(e);
      }
      await firebaseSignOut(auth);
      throw new Error(
        "Please verify your email before logging in. Check your inbox for a verification link."
      );
    }

    const profileData = await ensureCurrentUserProfile({ email: credential.user.email });
    setUser(credential.user);
    setProfile(profileData);
    persistProfileCache(profileData);
    return { credential, profile: profileData };
  };

  const signUp = async ({ username, email, password, photoURL }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseAuthProfile(credential.user, {
      displayName: username,
      photoURL: photoURL || null,
    });
    await ensureCurrentUserProfile({
      username,
      email,
      provider: "email",
      photo: photoURL || "",
    });

    try {
      await import("firebase/auth").then((m) => m.sendEmailVerification(credential.user));
    } catch (e) {
      console.error(e);
    }
    await firebaseSignOut(auth);

    return credential;
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
    persistProfileCache(null);
  };

  const updateProfile = async (partial) => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user");
    }
    await setDoc(doc(db, "users", auth.currentUser.uid), partial, { merge: true });
    setProfile((current) => {
      const next = current ? { ...current, ...partial } : current;
      persistProfileCache(next);
      return next;
    });
    return partial;
  };

  const resetPassword = async (email) => {
    if (!email) {
      throw new Error("Please provide an email address");
    }
    await sendPasswordResetEmail(auth, email.trim());
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      return null;
    }
    try {
      const profileData = await ensureCurrentUserProfile();
      setProfile(profileData);
      persistProfileCache(profileData);
      return profileData;
    } catch (err) {
      console.log("[AuthContext] refreshProfile failed (offline?):", err?.message);
      return profile; // return cached
    }
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      logout,
      refreshProfile,
      resetPassword,
      updateProfile,
    }),
    [loading, profile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
