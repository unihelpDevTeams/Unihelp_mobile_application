import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || Constants.manifest?.extra || {};
const env = typeof process !== "undefined" ? process.env || {} : {};

const firebaseConfig = {
  apiKey:
    extra.EXPO_PUBLIC_FIREBASE_API_KEY ||
    env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    "",
  authDomain:
    extra.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "",
  projectId:
    extra.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    "",
  storageBucket:
    extra.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "",
  messagingSenderId:
    extra.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "",
  appId:
    extra.EXPO_PUBLIC_FIREBASE_APP_ID ||
    env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    "",
  measurementId:
    extra.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    "",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });

// Initialize Firestore with local persistence enabled
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export { app, auth, db };