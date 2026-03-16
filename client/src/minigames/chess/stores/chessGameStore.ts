import { create } from 'zustand';
import type { Square } from '../constants';
import {
  COLOR_WHITE,
  COLOR_BLACK,
  GAME_STATUS_ACTIVE,
  isGameOver,
} from '../constants';
import type { GameState, PlayerStats, Challenge } from '../hooks/useChessContract';

interface ChessGameStore {
  // Game identification
  gameId: number | null;
  challengeId: number | null;

  // Players
  whitePlayer: string | null;
  blackPlayer: string | null;
  playerColor: number | null; // COLOR_WHITE or COLOR_BLACK
  whitePlayerStats: PlayerStats | null;
  blackPlayerStats: PlayerStats | null;

  // Board state
  board: Square[];
  previousBoard: Square[];
  selectedSquare: number | null;
  legalMoves: number[];

  // Time control
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;

  // Game status
  status: number;
  activeColor: number;
  isMyTurn: boolean;

  // Captured pieces (derived from board comparison)
  capturedByWhite: number[]; // Black pieces captured by white
  capturedByBlack: number[]; // White pieces captured by black

  // UI state
  promotionMove: { from: number; to: number } | null;
  isLoading: boolean;
  error: string | null;

  // Registration status
  isRegistered: boolean;

  // Challenge state (for waiting)
  pendingChallenge: Challenge | null;

  // Actions
  setGameId: (gameId: number | null) => void;
  setChallengeId: (challengeId: number | null) => void;
  setPlayers: (whitePlayer: string, blackPlayer: string) => void;
  setPlayerColor: (color: number | null) => void;
  setPlayerStats: (whiteStats: PlayerStats | null, blackStats: PlayerStats | null) => void;
  setBoard: (board: Square[]) => void;
  setSelectedSquare: (square: number | null) => void;
  setLegalMoves: (moves: number[]) => void;
  setTimeRemaining: (whiteMs: number, blackMs: number) => void;
  setLastMoveTimestamp: (timestamp: number) => void;
  setStatus: (status: number) => void;
  setActiveColor: (color: number) => void;
  setPromotionMove: (move: { from: number; to: number } | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setIsRegistered: (registered: boolean) => void;
  setPendingChallenge: (challenge: Challenge | null) => void;

  // Update from game state
  updateFromGameState: (state: GameState, localAddress: string) => void;

  // Calculate captured pieces from board diff
  updateCapturedPieces: (newBoard: Square[]) => void;

  // Reset
  reset: () => void;
}

// Initial empty board (64 squares)
const EMPTY_BOARD: Square[] = Array(64).fill(null).map(() => ({
  piece_type: 0,
  color: 0,
}));

export const useChessGameStore = create<ChessGameStore>((set, get) => ({
  // Initial state
  gameId: null,
  challengeId: null,
  whitePlayer: null,
  blackPlayer: null,
  playerColor: null,
  whitePlayerStats: null,
  blackPlayerStats: null,
  board: EMPTY_BOARD,
  previousBoard: EMPTY_BOARD,
  selectedSquare: null,
  legalMoves: [],
  whiteTimeMs: 0,
  blackTimeMs: 0,
  lastMoveTimestamp: Date.now(),
  status: GAME_STATUS_ACTIVE,
  activeColor: COLOR_WHITE,
  isMyTurn: false,
  capturedByWhite: [],
  capturedByBlack: [],
  promotionMove: null,
  isLoading: false,
  error: null,
  isRegistered: false,
  pendingChallenge: null,

  // Setters
  setGameId: (gameId) => set({ gameId }),
  setChallengeId: (challengeId) => set({ challengeId }),
  setPlayers: (whitePlayer, blackPlayer) => set({ whitePlayer, blackPlayer }),
  setPlayerColor: (color) => set({ playerColor: color }),
  setPlayerStats: (whiteStats, blackStats) => set({
    whitePlayerStats: whiteStats,
    blackPlayerStats: blackStats,
  }),
  setBoard: (board) => {
    const prev = get().board;
    set({ board, previousBoard: prev });
  },
  setSelectedSquare: (square) => set({ selectedSquare: square }),
  setLegalMoves: (moves) => set({ legalMoves: moves }),
  setTimeRemaining: (whiteMs, blackMs) => set({
    whiteTimeMs: whiteMs,
    blackTimeMs: blackMs,
  }),
  setLastMoveTimestamp: (timestamp) => set({ lastMoveTimestamp: timestamp }),
  setStatus: (status) => set({ status }),
  setActiveColor: (color) => {
    const { playerColor } = get();
    set({
      activeColor: color,
      isMyTurn: color === playerColor,
    });
  },
  setPromotionMove: (move) => set({ promotionMove: move }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  setIsRegistered: (registered) => set({ isRegistered: registered }),
  setPendingChallenge: (challenge) => set({ pendingChallenge: challenge }),

  // Update from game state
  updateFromGameState: (state, localAddress) => {
    const normalizedAddress = localAddress.toLowerCase();
    const isWhite = state.white_player.toLowerCase() === normalizedAddress;
    const isBlack = state.black_player.toLowerCase() === normalizedAddress;
    const playerColor = isWhite ? COLOR_WHITE : isBlack ? COLOR_BLACK : null;

    // Check if board actually changed (to avoid clearing selection on every poll)
    const currentBoard = get().board;
    const boardChanged = JSON.stringify(currentBoard) !== JSON.stringify(state.board);

    // Update captured pieces before setting new board
    if (boardChanged) {
      get().updateCapturedPieces(state.board);
    }

    // Only clear selection if the board changed (opponent moved)
    // This prevents wiping selection during polling when nothing happened
    const selectionUpdate = boardChanged ? {
      selectedSquare: null,
      legalMoves: [],
    } : {};

    set({
      gameId: state.game_id,
      whitePlayer: state.white_player,
      blackPlayer: state.black_player,
      playerColor,
      board: state.board,
      whiteTimeMs: state.white_time_remaining_ms,
      blackTimeMs: state.black_time_remaining_ms,
      lastMoveTimestamp: state.last_move_timestamp_ms,
      status: state.status,
      activeColor: state.active_color,
      isMyTurn: state.active_color === playerColor && !isGameOver(state.status),
      ...selectionUpdate,
    });
  },

  // Calculate captured pieces by comparing boards
  updateCapturedPieces: (newBoard) => {
    const { board: oldBoard, capturedByWhite, capturedByBlack } = get();

    // Count pieces on both boards
    const countPieces = (b: Square[]) => {
      const whitePieces: number[] = [];
      const blackPieces: number[] = [];

      for (const sq of b) {
        if (sq.piece_type > 0) {
          if (sq.color === COLOR_WHITE) {
            whitePieces.push(sq.piece_type);
          } else if (sq.color === COLOR_BLACK) {
            blackPieces.push(sq.piece_type);
          }
        }
      }

      return { whitePieces, blackPieces };
    };

    const oldCounts = countPieces(oldBoard);
    const newCounts = countPieces(newBoard);

    // Find newly captured pieces
    const findCaptured = (oldList: number[], newList: number[]): number[] => {
      const captured: number[] = [];
      const newCopy = [...newList];

      for (const piece of oldList) {
        const idx = newCopy.indexOf(piece);
        if (idx !== -1) {
          newCopy.splice(idx, 1);
        } else {
          captured.push(piece);
        }
      }

      return captured;
    };

    // Pieces missing from new board = captured
    const newlyCapWhite = findCaptured(oldCounts.blackPieces, newCounts.blackPieces);
    const newlyCapBlack = findCaptured(oldCounts.whitePieces, newCounts.whitePieces);

    if (newlyCapWhite.length > 0 || newlyCapBlack.length > 0) {
      set({
        capturedByWhite: [...capturedByWhite, ...newlyCapWhite],
        capturedByBlack: [...capturedByBlack, ...newlyCapBlack],
      });
    }
  },

  // Reset
  reset: () => set({
    gameId: null,
    challengeId: null,
    whitePlayer: null,
    blackPlayer: null,
    playerColor: null,
    whitePlayerStats: null,
    blackPlayerStats: null,
    board: EMPTY_BOARD,
    previousBoard: EMPTY_BOARD,
    selectedSquare: null,
    legalMoves: [],
    whiteTimeMs: 0,
    blackTimeMs: 0,
    lastMoveTimestamp: Date.now(),
    status: GAME_STATUS_ACTIVE,
    activeColor: COLOR_WHITE,
    isMyTurn: false,
    capturedByWhite: [],
    capturedByBlack: [],
    promotionMove: null,
    isLoading: false,
    error: null,
    pendingChallenge: null,
    // Note: don't reset isRegistered - that persists
  }),
}));
