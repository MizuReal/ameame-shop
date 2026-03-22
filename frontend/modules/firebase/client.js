import { initializeApp, getApps, getApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";

// Firebase client configuration is sourced from Expo public environment variables.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const hasExistingApp = getApps().length > 0;
const app = hasExistingApp ? getApp() : initializeApp(firebaseConfig);

// Prefer SecureStore for persisted auth sessions, fallback to AsyncStorage.
const secureStorePersistence = {
  async setItem(key, value) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (_error) {
      await AsyncStorage.setItem(key, value);
    }
  },
  async getItem(key) {
    try {
      const value = await SecureStore.getItemAsync(key);

      if (value !== null) {
        return value;
      }
    } catch (_error) {
      // Fallback to AsyncStorage when SecureStore is unavailable.
    }

    return AsyncStorage.getItem(key);
  },
  async removeItem(key) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (_error) {
      // Fall through to AsyncStorage cleanup.
    }

    await AsyncStorage.removeItem(key);
  },
};

let auth;

if (hasExistingApp) {
  auth = getAuth(app);
} else {
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(secureStorePersistence),
    });
  } catch (_error) {
    // initializeAuth throws if auth was already initialized in hot reload paths.
    auth = getAuth(app);
  }
}

export { app, auth };
