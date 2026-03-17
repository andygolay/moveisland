export interface PlayerState {
  id: string;
  walletAddress: string;
  nftImage: string;
  nftName: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  animation: 'idle' | 'walk' | 'run' | 'sitting';
  // Chess session info (set when player joins chess game or spectates)
  chessOdId?: string;
  chessTableId?: string;
  isSpectating?: boolean;
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
  animation: 'idle' | 'walk' | 'run' | 'sitting';
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

// Chess game types
export type ChessGameStatus = 'empty' | 'waiting' | 'playing';

export interface ChessPlayer {
  odId: string;
  displayName: string;
  nftImageUrl?: string;
  side: 'white' | 'black';
}

export interface ChessSpectator {
  odId: string;
  displayName: string;
  nftImageUrl?: string;
}

export interface ChessState {
  status: ChessGameStatus;
  player1: ChessPlayer | null;
  player2: ChessPlayer | null;
  spectators: ChessSpectator[];
  gameId?: number; // On-chain game ID
}

export interface ChessJoinMessage {
  type: 'chessJoin';
  tableId: string;
  player: ChessPlayer;
}

export interface ChessLeaveMessage {
  type: 'chessLeave';
  tableId: string;
  odId: string;
}

export interface ChessWatchMessage {
  type: 'chessWatch';
  tableId: string;
  spectator: ChessSpectator;
}

export interface ChessStopWatchingMessage {
  type: 'chessStopWatching';
  tableId: string;
  odId: string;
}

export interface ChessSetGameIdMessage {
  type: 'chessSetGameId';
  tableId: string;
  gameId: number;
}

export interface ChessStateMessage {
  type: 'chessState';
  tableId: string;
  state: ChessState;
}

export type ClientMessage = JoinMessage | PositionMessage | ChessJoinMessage | ChessLeaveMessage | ChessWatchMessage | ChessStopWatchingMessage | ChessSetGameIdMessage;
export type ServerMessage = PlayersMessage | PlayerJoinedMessage | PlayerLeftMessage | ErrorMessage | ChessStateMessage;
