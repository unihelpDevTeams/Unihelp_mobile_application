import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as updateFirebaseAuthProfile,
} from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { ensureCurrentUserProfile } from '../src/shared/services/firestore';
import { doc, setDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const provider = firebaseUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email';
        const profileData = await ensureCurrentUserProfile({ provider });
        setUser(firebaseUser);
        setProfile(profileData);
      } else {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    
    if (!credential.user.emailVerified) {
      try {
        await import('firebase/auth').then(m => m.sendEmailVerification(credential.user));
      } catch (e) {
        console.error(e);
      }
      await firebaseSignOut(auth);
      throw new Error('Please verify your email before logging in. Check your inbox for a verification link.');
    }
    
    const profileData = await ensureCurrentUserProfile({ email: credential.user.email });
    setUser(credential.user);
    setProfile(profileData);
    return { credential, profile: profileData };
  };

  const signUp = async ({ username, email, password, photoURL }) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseAuthProfile(credential.user, { displayName: username, photoURL: photoURL || null });
    await ensureCurrentUserProfile({
      username,
      email,
      provider: 'email',
      photo: photoURL || '',
    });
    
    try {
      await import('firebase/auth').then(m => m.sendEmailVerification(credential.user));
    } catch (e) {
      console.error(e);
    }
    await firebaseSignOut(auth);
    
    return credential;
  };

  const saveRole = async (role) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }

    const profileData = await ensureCurrentUserProfile({
      role,
    });

    setProfile(profileData);
    return profileData;
  };

  const logout = async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (partial) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user');
    }
    await setDoc(doc(db, 'users', auth.currentUser.uid), partial, { merge: true });
    setProfile((current) => (current ? { ...current, ...partial } : current));
    return partial;
  };

  const resetPassword = async (email) => {
    if (!email) {
      throw new Error('Please provide an email address');
    }

    await sendPasswordResetEmail(auth, email.trim());
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) {
      return null;
    }

    const profileData = await ensureCurrentUserProfile();
    setProfile(profileData);
    return profileData;
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      signIn,
      signUp,
      saveRole,
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
