import { initializeApp } from "firebase/app";
import { arrayUnion, doc, getDoc, getFirestore, setDoc } from "firebase/firestore";
import type { Player } from "../sim/types";

const getPlayerIdsForSeason = async (season: string) => {
  const res = await fetch(`http://localhost:8000/players/season/${season}`);
  return await res.json();
}

const getPlayerData = async (playerID: number, season: string) => {
  try {
    const res = await fetch(`http://localhost:8000/players/${playerID}/profile/${season}`);
    return await res.json();
  } catch(e) {
    console.error(e);
    return undefined;
  }
}

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

const getCachedPlayerData = async (id: number, season: string) => {
    const res = await getDoc(doc(db, `player/${id}/season/${season}`));
    return res.exists();
}

const cachePlayerData = async (data: Player) => {
    await setDoc(doc(db, `player/${data.id}/season/${data.season}`), data);
    await setDoc(doc(db, `player/${data.id}`), { 
        firstName: data.name.split(" ")[0].toLowerCase(),
        lastName: data.name.split(" ")[1].toLowerCase(),
        seasons: arrayUnion(data.season)
    }, { merge: true });
    console.log(`Cached ${data.name} data at: player/${data.id}/season/${data.season}`)
}

async function main() {
    console.log("starting")
    const szn = '2022-23';
    const sznData = await getPlayerIdsForSeason(szn);
    const ids = sznData as number[];
    console.log("Found " + ids.length + " players");

    for(const id of ids){
        if (await getCachedPlayerData(id, szn)) {
            console.log("   (cached)");
            continue;
        }
        const p = await getPlayerData(id, szn);
        if (p as Player) { cachePlayerData(p as Player) }
    }
}
main().catch(console.error);