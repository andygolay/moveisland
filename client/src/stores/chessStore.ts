import { create } from 'zustand';

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

export interface ChessTableState {
  status: ChessGameStatus;
  player1: ChessPlayer | null;
  player2: ChessPlayer | null;
  spectators: ChessSpectator[];
  gameId?: number;
  challengeId?: number;
}

interface ChessState {
  // All table states (keyed by tableId)
  tableStates: Map<string, ChessTableState>;
  updateTableState: (tableId: string, state: ChessTableState) => void;

  // Which table is the player near/interacting with
  activeTableId: string | null;
  setActiveTableId: (tableId: string | null) => void;

  // Game status (derived from activeTableId's state)
  status: ChessGameStatus;
  setStatus: (status: ChessGameStatus) => void;

  // On-chain game ID (from server, for spectators)
  serverGameId: number | null;
  setServerGameId: (gameId: number | null) => void;

  // On-chain challenge ID (from server, for joiner to accept)
  serverChallengeId: number | null;
  setServerChallengeId: (challengeId: number | null) => void;

  // Players in the game
  player1: ChessPlayer | null;
  player2: ChessPlayer | null;
  setPlayer1: (player: ChessPlayer | null) => void;
  setPlayer2: (player: ChessPlayer | null) => void;

  // Spectators watching the game
  spectators: ChessSpectator[];
  setSpectators: (spectators: ChessSpectator[]) => void;
  addSpectator: (spectator: ChessSpectator) => void;
  removeSpectator: (odId: string) => void;

  // Is local player near a table?
  isNearTable: boolean;
  setIsNearTable: (near: boolean) => void;

  // Is local player spectating?
  isSpectating: boolean;
  setIsSpectating: (spectating: boolean) => void;

  // Is local player in the chess game view?
  isInChessView: boolean;
  setIsInChessView: (inView: boolean) => void;

  // Did local player initiate the waiting state?
  didStartWaiting: boolean;
  setDidStartWaiting: (started: boolean) => void;

  // Local player's side (if in game)
  localPlayerSide: 'white' | 'black' | null;
  setLocalPlayerSide: (side: 'white' | 'black' | null) => void;

  // Whose turn is it?
  currentTurn: 'white' | 'black';
  setCurrentTurn: (turn: 'white' | 'black') => void;

  // Join/leave game actions
  joinGame: (player: ChessPlayer) => void;
  leaveGame: (odId: string) => void;
  resetGame: () => void;
}

export const useChessStore = create<ChessState>((set, get) => ({
  // All table states
  tableStates: new Map(),
  updateTableState: (tableId, state) => {
    const { tableStates, activeTableId } = get();
    const newMap = new Map(tableStates);
    newMap.set(tableId, state);

    // If this is the active table, also update the current state
    if (activeTableId === tableId) {
      set({
        tableStates: newMap,
        status: state.status,
        player1: state.player1,
        player2: state.player2,
        spectators: state.spectators,
        serverGameId: state.gameId ?? null,
        serverChallengeId: state.challengeId ?? null,
      });
    } else {
      set({ tableStates: newMap });
    }
  },

  // Active table
  activeTableId: null,
  setActiveTableId: (tableId) => {
    const { tableStates } = get();

    if (tableId) {
      const tableState = tableStates.get(tableId);
      if (tableState) {
        // Load state from the map for this table
        set({
          activeTableId: tableId,
          status: tableState.status,
          player1: tableState.player1,
          player2: tableState.player2,
          spectators: tableState.spectators,
          serverGameId: tableState.gameId ?? null,
          serverChallengeId: tableState.challengeId ?? null,
        });
      } else {
        // No state yet for this table, set to empty
        set({
          activeTableId: tableId,
          status: 'empty',
          player1: null,
          player2: null,
          spectators: [],
          serverGameId: null,
          serverChallengeId: null,
        });
      }
    } else {
      set({ activeTableId: null });
    }
  },

  // Status
  status: 'empty',
  setStatus: (status) => set({ status }),

  // Server game ID
  serverGameId: null,
  setServerGameId: (gameId) => set({ serverGameId: gameId }),

  // Server challenge ID
  serverChallengeId: null,
  setServerChallengeId: (challengeId) => set({ serverChallengeId: challengeId }),

  // Players
  player1: null,
  player2: null,
  setPlayer1: (player) => set({ player1: player }),
  setPlayer2: (player) => set({ player2: player }),

  // Spectators
  spectators: [],
  setSpectators: (spectators) => set({ spectators }),
  addSpectator: (spectator) => {
    const { spectators } = get();
    if (!spectators.find(s => s.odId === spectator.odId)) {
      set({ spectators: [...spectators, spectator] });
    }
  },
  removeSpectator: (odId) => {
    const { spectators } = get();
    set({ spectators: spectators.filter(s => s.odId !== odId) });
  },

  // Proximity
  isNearTable: false,
  setIsNearTable: (near) => set({ isNearTable: near }),

  // Spectating
  isSpectating: false,
  setIsSpectating: (spectating) => set({ isSpectating: spectating }),

  // View state
  isInChessView: false,
  setIsInChessView: (inView) => set({ isInChessView: inView }),

  // Did start waiting
  didStartWaiting: false,
  setDidStartWaiting: (started) => set({ didStartWaiting: started }),

  // Local player side
  localPlayerSide: null,
  setLocalPlayerSide: (side) => set({ localPlayerSide: side }),

  // Turn
  currentTurn: 'white',
  setCurrentTurn: (turn) => set({ currentTurn: turn }),

  // Join game
  joinGame: (player) => {
    const { player1, player2 } = get();

    if (!player1) {
      // First player joins as white
      set({
        player1: { ...player, side: 'white' },
        status: 'waiting',
      });
    } else if (!player2 && player1.odId !== player.odId) {
      // Second player joins as black, game starts
      set({
        player2: { ...player, side: 'black' },
        status: 'playing',
        currentTurn: 'white',
      });
    }
  },

  // Leave game
  leaveGame: (odId) => {
    const { player1, player2 } = get();

    if (player1?.odId === odId) {
      // Player 1 left - if player 2 exists, they become player 1
      if (player2) {
        set({
          player1: { ...player2, side: 'white' },
          player2: null,
          status: 'waiting',
        });
      } else {
        set({
          player1: null,
          status: 'empty',
        });
      }
    } else if (player2?.odId === odId) {
      // Player 2 left
      set({
        player2: null,
        status: 'waiting',
      });
    }
  },

  // Reset game
  resetGame: () => set({
    status: 'empty',
    player1: null,
    player2: null,
    spectators: [],
    serverGameId: null,
    serverChallengeId: null,
    isInChessView: false,
    isSpectating: false,
    localPlayerSide: null,
    currentTurn: 'white',
    didStartWaiting: false,
  }),
}));
