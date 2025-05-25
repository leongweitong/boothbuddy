// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDkkYCcdNzwHHWHtGuk-dFAd-jwU47f7M4",
  authDomain: "boothbuddy-2359b.firebaseapp.com",
  projectId: "boothbuddy-2359b",
  storageBucket: "boothbuddy-2359b.firebasestorage.app",
  messagingSenderId: "552126727280",
  appId: "1:552126727280:web:97cc1c296092ddfe1aa0b5"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);