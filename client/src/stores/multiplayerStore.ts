import { create } from 'zustand';
import type { PlayerAnimation } from './playerStore';

export interface OtherPlayer {
  id: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  animation: PlayerAnimation;
  nftImage: string;
  nftName: string;
}

interface MultiplayerState {
  // Connection state
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;

  // Other players
  otherPlayers: Map<string, OtherPlayer>;

  // Actions
  updatePlayer: (player: OtherPlayer) => void;
  updatePlayers: (players: OtherPlayer[]) => void;
  removePlayer: (playerId: string) => void;
  clearPlayers: () => void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),

  otherPlayers: new Map(),

  updatePlayer: (player) => {
    const players = new Map(get().otherPlayers);
    players.set(player.id, player);
    set({ otherPlayers: players });
  },

  updatePlayers: (players) => {
    const currentPlayers = new Map(get().otherPlayers);
    for (const player of players) {
      currentPlayers.set(player.id, player);
    }
    set({ otherPlayers: currentPlayers });
  },

  removePlayer: (playerId) => {
    const players = new Map(get().otherPlayers);
    players.delete(playerId);
    set({ otherPlayers: players });
  },

  clearPlayers: () => {
    set({ otherPlayers: new Map() });
  },
}));
