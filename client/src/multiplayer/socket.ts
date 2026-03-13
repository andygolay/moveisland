import PartySocket from 'partysocket';
import { useMultiplayerStore, type OtherPlayer } from '../stores/multiplayerStore';
import type { PlayerAnimation } from '../stores/playerStore';

// Server configuration
const PARTYKIT_HOST = import.meta.env.VITE_PARTYKIT_HOST || 'localhost:1999';
const ROOM_ID = 'island';

// Message types (must match server)
interface JoinMessage {
  type: 'join';
  walletAddress: string;
  nftImage: string;
  nftName: string;
}

interface PositionMessage {
  type: 'position';
  x: number;
  y: number;
  z: number;
  rotation: number;
  animation: PlayerAnimation;
}

interface PlayersMessage {
  type: 'players';
  players: OtherPlayer[];
}

interface PlayerJoinedMessage {
  type: 'playerJoined';
  player: OtherPlayer;
}

interface PlayerLeftMessage {
  type: 'playerLeft';
  playerId: string;
}

type ServerMessage = PlayersMessage | PlayerJoinedMessage | PlayerLeftMessage;

// Singleton socket instance
let socket: PartySocket | null = null;
let lastPositionUpdate = 0;
const POSITION_UPDATE_INTERVAL = 33; // ~30fps

export function connectToServer(
  walletAddress: string,
  nftImage: string,
  nftName: string
): PartySocket {
  // Disconnect existing socket if any
  if (socket) {
    socket.close();
  }

  const { setIsConnected, updatePlayer, updatePlayers, removePlayer, clearPlayers } =
    useMultiplayerStore.getState();

  // Create new socket
  socket = new PartySocket({
    host: PARTYKIT_HOST,
    room: ROOM_ID,
  });

  socket.addEventListener('open', () => {
    console.log('[Multiplayer] Connected to server');
    setIsConnected(true);

    // Send join message
    const joinMsg: JoinMessage = {
      type: 'join',
      walletAddress,
      nftImage,
      nftName,
    };
    socket?.send(JSON.stringify(joinMsg));
  });

  socket.addEventListener('message', (event) => {
    try {
      const data: ServerMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'players':
          updatePlayers(data.players);
          break;
        case 'playerJoined':
          updatePlayer(data.player);
          console.log('[Multiplayer] Player joined:', data.player.id);
          break;
        case 'playerLeft':
          removePlayer(data.playerId);
          console.log('[Multiplayer] Player left:', data.playerId);
          break;
      }
    } catch (error) {
      console.error('[Multiplayer] Failed to parse message:', error);
    }
  });

  socket.addEventListener('close', () => {
    console.log('[Multiplayer] Disconnected from server');
    setIsConnected(false);
    clearPlayers();
  });

  socket.addEventListener('error', (error) => {
    console.error('[Multiplayer] Socket error:', error);
  });

  return socket;
}

export function disconnectFromServer() {
  if (socket) {
    socket.close();
    socket = null;
  }
  useMultiplayerStore.getState().setIsConnected(false);
  useMultiplayerStore.getState().clearPlayers();
}

export function sendPosition(
  x: number,
  y: number,
  z: number,
  rotation: number,
  animation: PlayerAnimation
) {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  // Throttle position updates
  const now = Date.now();
  if (now - lastPositionUpdate < POSITION_UPDATE_INTERVAL) return;
  lastPositionUpdate = now;

  const msg: PositionMessage = {
    type: 'position',
    x,
    y,
    z,
    rotation,
    animation,
  };
  socket.send(JSON.stringify(msg));
}

export function getSocket(): PartySocket | null {
  return socket;
}
