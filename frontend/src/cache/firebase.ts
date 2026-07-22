import { initializeApp } from "firebase/app";
import { addDoc, doc, DocumentReference, getDoc, getFirestore, setDoc, updateDoc } from "firebase/firestore";
import type { Player } from "../sim/types";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCyjXrna3XPPK4B44_JjKn3GTizvLm6iZA",
  authDomain: "nba-matchup-cache.firebaseapp.com",
  projectId: "nba-matchup-cache",
  storageBucket: "nba-matchup-cache.firebasestorage.app",
  messagingSenderId: "91072386769",
  appId: "1:91072386769:web:35e2ed84768d26947cd7f0",
  measurementId: "G-24S6TMQ5RX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export const getCachedPlayerData = async (playerID: number, season: string) => {
    const data = await getDoc(doc(db, `player/${playerID}/season/${season}`));
    if (data.exists()) {
        return data.data();
    } else {
        return undefined;
    }
}

export const cachePlayerData = async (data: Player) => {
    await setDoc(doc(db, `player/${data.id}/season/${data.season}`), data);
    await setDoc(doc(db, `player/${data.id}`), { "name" : data.name});
    console.log(`Cached data at: player/${data.id}/season/${data.season}`)
}