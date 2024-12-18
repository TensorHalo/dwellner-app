import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getAuth, Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyD63kr2INanIG_MyrPv2lFVH2EdQdK6OZI",
    authDomain: "appauth-b2f90.firebaseapp.com",
    projectId: "appauth-b2f90",
    storageBucket: "appauth-b2f90.firebasestorage.app",
    messagingSenderId: "519406639757",
    appId: "1:519406639757:web:235a78c774b64ef7aee0c4",
    measurementId: "G-FE63HBFM9H"
};

let app;
let auth: Auth;
let db: Firestore;

if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
    db = initializeFirestore(app, {
        experimentalForceLongPolling: true,
    });
} else {
    app = getApp();
    auth = getAuth(app);
    db = getFirestore(app);
}

export { auth, db, firebaseConfig };