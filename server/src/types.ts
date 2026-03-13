export interface PlayerState {
  id: string;
  walletAddress: string;
  nftImage: string;
  nftName: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  animation: 'idle' | 'walk' | 'run';
}

export interface JoinMessage {
  type: 'join';
  walletAddress: string;
  nftImage: string;
  nftName: string;
}

export interface PositionMessage {
  type: 'position';
  x: number;
  y: number;
  z: number;
  rotation: number;
  animation: 'idle' | 'walk' | 'run';
}

export interface PlayersMessage {
  type: 'players';
  players: PlayerState[];
}

export interface PlayerJoinedMessage {
  type: 'playerJoined';
  player: PlayerState;
}

export interface PlayerLeftMessage {
  type: 'playerLeft';
  playerId: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type ClientMessage = JoinMessage | PositionMessage;
export type ServerMessage = PlayersMessage | PlayerJoinedMessage | PlayerLeftMessage | ErrorMessage;
