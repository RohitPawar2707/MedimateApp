// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSWm_U0efw-N7iQoEmDvSQU-SKQ6LNwjc",
  authDomain: "medimate-888bc.firebaseapp.com",
  projectId: "medimate-888bc",
  storageBucket: "medimate-888bc.firebasestorage.app",
  messagingSenderId: "149066884155",
  appId: "1:149066884155:web:ba7dfb835afae27199a81e"
};

import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
const db = getFirestore(app);
const storage = getStorage(app);

export default app;
export { auth, db, storage };