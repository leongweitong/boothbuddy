// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
// import { getAnalytics } from "firebase/analytics";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC5N9YF6MVbyD7PsdMkn-Xsm7l6ZD_R5Js",
  authDomain: "boothbuddy-9bb27.firebaseapp.com",
  projectId: "boothbuddy-9bb27",
  storageBucket: "boothbuddy-9bb27.firebasestorage.app",
  messagingSenderId: "695720709545",
  appId: "1:695720709545:web:7a56061e19f2db75cc88b8",
  measurementId: "G-K9DR9HXKLY"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});

export const db = getFirestore(app);
// export const analytics = getAnalytics(app);