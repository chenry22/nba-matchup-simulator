import axios from "axios";

const API = axios.create({
  baseURL: "https://nba-player-profiles.onrender.com",
});

export const searchPlayers = (q: any) =>
  API.get(`/players/search?q=${q}`);

export const getPlayerSeasons = (playerID: number) => 
  API.get(`/players/${playerID}/seasons`);

export const getPlayerData = async (playerID: number, season: string) => {
  try {
    return await API.get(`/players/${playerID}/profile/${season}`);
  } catch(e) {
    console.error(e);
    return undefined;
  }
}

export const getActivePlayers = () =>
  API.get(`/players/active`);