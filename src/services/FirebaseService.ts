import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup, linkWithPopup, EmailAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyBIUIq5EW5kwIyz856M4p_7t0IEckSe6Hw",
    authDomain: "notibee-441b2.firebaseapp.com",
    projectId: "notibee-441b2",
    storageBucket: "notibee-441b2.firebasestorage.app",
    messagingSenderId: "119747383801",
    appId: "1:119747383801:web:placeholder"
};

const app = initializeApp(firebaseConfig);

// Enable persistent local cache for faster loads and offline support
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});

import { getStorage } from 'firebase/storage';

export const auth = getAuth(app);
export const storage = getStorage(app);

export const initFirebase = async () => {
    try {
        if (!auth.currentUser) {
            await signInAnonymously(auth);
        }
    } catch (e) {
        console.error('Firebase Auth Error', e);
    }
}
