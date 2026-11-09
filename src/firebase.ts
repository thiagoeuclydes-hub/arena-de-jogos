import { initializeApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import cfg from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || cfg.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || cfg.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || cfg.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || cfg.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || cfg.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || cfg.appId,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app;
export let db: Firestore | null = null;

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, cfg.firestoreDatabaseId);
  } catch (e) {
    console.error("Firebase init error:", e);
  }
}
