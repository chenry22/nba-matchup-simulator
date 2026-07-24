import { initializeApp } from "firebase/app";
import { addDoc, getDocs, arrayUnion, collection, doc, DocumentReference, getDoc, getFirestore, limit, orderBy, query, setDoc, startAt, updateDoc, where, collectionGroup } from "firebase/firestore";
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

export interface FirebasePlayerMatch {
    id: number;
    firstName: string;
    lastName: string;
    seasons: string[];
}

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
    await setDoc(doc(db, `player/${data.id}`), { 
        firstName: data.name.split(" ")[0].toLowerCase(),
        lastName: data.name.split(" ")[1].toLowerCase(),
        seasons: arrayUnion(data.season)
    });
    console.log(`Cached data at: player/${data.id}/season/${data.season}`)
}

export const searchForPlayer = async (key: string) => {
    const str = key.toLowerCase().trim();
    const firstName = str.split(" ").length > 1 ? str.split(" ")[0] : undefined;
    const lastName = str.split(" ").length > 1 ? str.split(" ")[1] : undefined;

    const firstNameMatches = await getDocs(query(
        collection(db, "player"), orderBy("firstName"),
        startAt(firstName ?? str), limit(3)
    ));
    const lastNameMatches = await getDocs(query(
        collection(db, "player"), orderBy("lastName"),
        startAt(lastName ?? str), limit(3)
    ));
    const matches: FirebasePlayerMatch[] = [];
    firstNameMatches.forEach(d => {
        const p = {...d.data(), id: parseInt(d.id) } as FirebasePlayerMatch;
        if (p && p.firstName.startsWith(firstName ?? str)) {
            matches.push(p);
        }
    });
    lastNameMatches.forEach(d => {
        const p = {...d.data(), id: parseInt(d.id) } as FirebasePlayerMatch;
        if (p && p.firstName.startsWith(firstName ?? "") && p.lastName.startsWith(lastName ?? str) 
            && !matches.find(a => a.id === p.id)) 
        {
            matches.push(p);
        }
    });
    matches.forEach(d => {
        d.firstName = d.firstName.charAt(0).toUpperCase() + d.firstName.slice(1);
        d.lastName = d.lastName.charAt(0).toUpperCase() + d.lastName.slice(1);
    })
    return matches;
}

export const loadPlayersFromSeason = async (season: string) => {
    try {
        const docs = await getDocs(query(
            collectionGroup(db, "season"), where('season', '==', season)
        ));
        
        return docs.docs;
    } catch(e) {
        console.warn(e);
        return [];
    }
}