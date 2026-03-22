import { useCallback, useMemo } from 'react';
import { useWallet } from '@moveindustries/wallet-adapter-react';
import { Movement, MovementConfig, Network } from '@moveindustries/ts-sdk';
import type { Square } from '../constants';
import {
  CHESS_CONTRACT_ADDRESS,
  MOVEMENT_NODE_URL,
  CHALLENGE_STATUS_OPEN,
  CHALLENGE_STATUS_ACCEPTED,
  INITIAL_RATING,
} from '../constants';

// Types for game state
export interface GameState {
  game_id: number;
  white_player: string;
  black_player: string;
  board: Square[];
  active_color: number;
  status: number;
  white_time_remaining_ms: number;
  black_time_remaining_ms: number;
  last_move_timestamp_ms: number;
}

export interface PlayerStats {
  rating: number;
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Challenge {
  challenge_id: number;
  challenger: string;
  opponent: string;
  time_control_base_seconds: number;
  time_control_increment_seconds: number;
  challenger_color_pref: number;
  status: number;
  expires_at_ms: number;
  min_rating: number;
  max_rating: number;
}

// Create Movement client - use Network.CUSTOM to avoid SDK overriding URLs
const movementConfig = new MovementConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_NODE_URL,
});

const movement = new Movement(movementConfig);

// Get the module address for contract calls
function getChessModuleAddress(): string {
  if (!CHESS_CONTRACT_ADDRESS) {
    console.warn('VITE_CHESS_CONTRACT_ADDRESS not set');
    return '';
  }
  return CHESS_CONTRACT_ADDRESS;
}

export function useChessContract() {
  const { account, signAndSubmitTransaction, connected } = useWallet();
  const address = account?.address?.toString();
  const moduleAddress = getChessModuleAddress();

  // ============== VIEW FUNCTIONS ==============

  // Check if a player is registered
  const isRegistered = useCallback(async (playerAddress?: string): Promise<boolean> => {
    const addr = playerAddress || address;
    if (!addr || !moduleAddress) return false;

    try {
      const result = await movement.view({
        payload: {
          function: `${moduleAddress}::chess_leaderboard::is_registered`,
          typeArguments: [],
          functionArguments: [addr],
        },
      });
      return Array.isArray(result) ? Boolean(result[0]) : Boolean(result);
    } catch (err) {
      console.error('[Chess] Failed to check registration:', err);
      return false;
    }
  }, [address, moduleAddress]);

  // Get player stats (rating, wins, losses, draws)
  const getPlayerStats = useCallback(async (playerAddress?: string): Promise<PlayerStats | null> => {
    const addr = playerAddress || address;
    if (!addr || !moduleAddress) return null;

    try {
      const result = await movement.view({
        payload: {
          function: `${moduleAddress}::chess_leaderboard::get_player_stats`,
          typeArguments: [],
          functionArguments: [addr],
        },
      });
      const data = Array.isArray(result) ? result[0] : result;
      if (!data) return null;

      return {
        rating: Number((data as Record<string, unknown>).rating || INITIAL_RATING),
        games_played: Number((data as Record<string, unknown>).games_played || 0),
        wins: Number((data as Record<string, unknown>).wins || 0),
        losses: Number((data as Record<string, unknown>).losses || 0),
        draws: Number((data as Record<string, unknown>).draws || 0),
      };
    } catch (err) {
      console.error('[Chess] Failed to get player stats:', err);
      return null;
    }
  }, [address, moduleAddress]);

  // Get game state
  const getGameState = useCallback(async (gameId: number): Promise<GameState | null> => {
    if (!moduleAddress) return null;

    try {
      const [stateResult, boardResult, timeResult] = await Promise.all([
        movement.view({
          payload: {
            function: `${moduleAddress}::chess_game::get_game_state`,
            typeArguments: [],
            functionArguments: [gameId.toString()],
          },
        }),
        movement.view({
          payload: {
            function: `${moduleAddress}::chess_game::get_board`,
            typeArguments: [],
            functionArguments: [gameId.toString()],
          },
        }),
        movement.view({
          payload: {
            function: `${moduleAddress}::chess_game::get_current_time_remaining`,
            typeArguments: [],
            functionArguments: [gameId.toString()],
          },
        }),
      ]);

      const fetchTimestamp = Date.now();
      const stateData = Array.isArray(stateResult) ? stateResult : [stateResult];
      const boardData = Array.isArray(boardResult) ? boardResult[0] : boardResult;
      const board = Array.isArray(boardData)
        ? boardData.map((sq: unknown) => ({
            piece_type: Number((sq as Record<string, unknown>).piece_type || 0),
            color: Number((sq as Record<string, unknown>).color || 0),
          }))
        : [];
      const timeData = Array.isArray(timeResult) ? timeResult : [timeResult];

      return {
        game_id: Number(stateData[0] || 0),
        white_player: String(stateData[1] || ''),
        black_player: String(stateData[2] || ''),
        board,
        active_color: Number(stateData[3] || 1),
        status: Number(stateData[4] || 0),
        white_time_remaining_ms: Number(timeData[0] || 0),
        black_time_remaining_ms: Number(timeData[1] || 0),
        last_move_timestamp_ms: fetchTimestamp,
      };
    } catch (err) {
      console.error('[Chess] Failed to get game state:', err);
      return null;
    }
  }, [moduleAddress]);

  // Get legal moves for a square
  const getLegalMoves = useCallback(async (gameId: number, square: number): Promise<number[]> => {
    if (!moduleAddress) return [];

    try {
      const result = await movement.view({
        payload: {
          function: `${moduleAddress}::chess_game::get_legal_moves_for_square`,
          typeArguments: [],
          functionArguments: [gameId.toString(), square.toString()],
        },
      });

      const data = Array.isArray(result) ? result[0] : result;

      // Parse hex string to byte array (each 2 hex chars = 1 u8 square index)
      if (typeof data === 'string' && data.startsWith('0x')) {
        const hex = data.slice(2);
        const moves: number[] = [];
        for (let i = 0; i < hex.length; i += 2) {
          moves.push(parseInt(hex.substring(i, i + 2), 16));
        }
        return moves;
      }

      // Fallback for array format
      const moves = Array.isArray(data) ? data : [];
      return moves.map((m: unknown) => Number(m));
    } catch (err) {
      console.error('[Chess] Failed to get legal moves:', err);
      return [];
    }
  }, [moduleAddress]);

  // Get open challenges
  const getOpenChallenges = useCallback(async (): Promise<Challenge[]> => {
    if (!moduleAddress) return [];

    try {
      const result = await movement.view({
        payload: {
          function: `${moduleAddress}::chess_lobby::get_open_challenges`,
          typeArguments: [],
          functionArguments: [],
        },
      });

      const data = Array.isArray(result) ? result[0] : result;
      if (!Array.isArray(data)) return [];

      return data
        .map((c: unknown) => {
          const challenge = c as Record<string, unknown>;
          return {
            challenge_id: Number(challenge.challenge_id || 0),
            challenger: String(challenge.challenger || ''),
            opponent: String(challenge.opponent || ''),
            time_control_base_seconds: Number(challenge.time_control_base_seconds || 0),
            time_control_increment_seconds: Number(challenge.time_control_increment_seconds || 0),
            challenger_color_pref: Number(challenge.challenger_color_pref || 0),
            status: Number(challenge.status || 0),
            expires_at_ms: Number(challenge.expires_at_ms || 0),
            min_rating: Number(challenge.min_rating || 0),
            max_rating: Number(challenge.max_rating || 0),
          };
        })
        .filter((c) => c.status === CHALLENGE_STATUS_OPEN);
    } catch (err) {
      console.error('[Chess] Failed to get open challenges:', err);
      return [];
    }
  }, [moduleAddress]);

  // Get challenge by ID
  const getChallenge = useCallback(async (challengeId: number): Promise<Challenge | null> => {
    if (!moduleAddress) return null;

    try {
      const result = await movement.view({
        payload: {
          function: `${moduleAddress}::chess_lobby::get_challenge`,
          typeArguments: [],
          functionArguments: [challengeId.toString()],
        },
      });

      const data = Array.isArray(result) ? result[0] : result;
      if (!data) return null;

      const challenge = data as Record<string, unknown>;
      return {
        challenge_id: Number(challenge.challenge_id || 0),
        challenger: String(challenge.challenger || ''),
        opponent: String(challenge.opponent || ''),
        time_control_base_seconds: Number(challenge.time_control_base_seconds || 0),
        time_control_increment_seconds: Number(challenge.time_control_increment_seconds || 0),
        challenger_color_pref: Number(challenge.challenger_color_pref || 0),
        status: Number(challenge.status || 0),
        expires_at_ms: Number(challenge.expires_at_ms || 0),
        min_rating: Number(challenge.min_rating || 0),
        max_rating: Number(challenge.max_rating || 0),
      };
    } catch (err) {
      console.error('[Chess] Failed to get challenge:', err);
      return null;
    }
  }, [moduleAddress]);

  // Get game ID for a challenge
  const getGameIdForChallenge = useCallback(async (challengeId: number): Promise<number> => {
    if (!moduleAddress) return 0;

    try {
      const result = await movement.view({
        payload: {
          function: `${moduleAddress}::chess_lobby::get_game_id_for_challenge`,
          typeArguments: [],
          functionArguments: [challengeId.toString()],
        },
      });

      let rawId = Array.isArray(result) ? result[0] : result;
      if (Array.isArray(rawId)) rawId = rawId[0];

      if (typeof rawId === 'string') {
        return rawId.startsWith('0x') ? parseInt(rawId, 16) : parseInt(rawId, 10);
      }
      return Number(rawId);
    } catch (err) {
      console.error('[Chess] Failed to get game ID for challenge:', err);
      return 0;
    }
  }, [moduleAddress]);

  // ============== ENTRY FUNCTIONS ==============

  // Register player
  const registerPlayer = useCallback(async (): Promise<boolean> => {
    if (!connected || !moduleAddress) return false;

    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${moduleAddress}::chess_leaderboard::register_player`,
          typeArguments: [],
          functionArguments: [],
        },
      });

      // Wait for transaction to be confirmed on-chain
      if (response?.hash) {
        console.log('[Chess] Waiting for registration tx:', response.hash);
        await movement.transaction.waitForTransaction({
          transactionHash: response.hash,
        });
        console.log('[Chess] Registration tx confirmed');
      }

      return true;
    } catch (err) {
      console.error('[Chess] Failed to register player:', err);
      return false;
    }
  }, [connected, moduleAddress, signAndSubmitTransaction]);

  // Create open challenge
  const createChallenge = useCallback(async (
    baseSeconds: number,
    incrementSeconds: number = 0,
    colorPref: number = 0,
    minRating: number = 0,
    maxRating: number = 0,
    expirySeconds: number = 3600
  ): Promise<boolean> => {
    if (!connected || !moduleAddress) return false;

    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${moduleAddress}::chess_lobby::create_open_challenge`,
          typeArguments: [],
          functionArguments: [
            baseSeconds.toString(),
            incrementSeconds.toString(),
            colorPref.toString(),
            minRating.toString(),
            maxRating.toString(),
            expirySeconds.toString(),
          ],
        },
      });

      // Wait for transaction to be confirmed on-chain before querying challenges
      if (response?.hash) {
        console.log('[Chess] Waiting for create_challenge tx:', response.hash);
        await movement.transaction.waitForTransaction({
          transactionHash: response.hash,
        });
        console.log('[Chess] create_challenge tx confirmed');
      }

      return true;
    } catch (err) {
      console.error('[Chess] Failed to create challenge:', err);
      return false;
    }
  }, [connected, moduleAddress, signAndSubmitTransaction]);

  // Accept challenge
  const acceptChallenge = useCallback(async (challengeId: number): Promise<boolean> => {
    if (!connected || !moduleAddress) return false;

    try {
      const response = await signAndSubmitTransaction({
        data: {
          function: `${moduleAddress}::chess_lobby::accept_challenge`,
          typeArguments: [],
          functionArguments: [challengeId.toString()],
        },
      });

      // Wait for transaction to be confirmed on-chain
      if (response?.hash) {
        console.log('[Chess] Waiting for accept_challenge tx:', response.hash);
        await movement.transaction.waitForTransaction({
          transactionHash: response.hash,
        });
        console.log('[Chess] accept_challenge tx confirmed');
      }

      return true;
    } catch (err) {
      console.error('[Chess] Failed to accept challenge:', err);
      return false;
    }
  }, [connected, moduleAddress, signAndSubmitTransaction]);

  // Cancel challenge
  const cancelChallenge = useCallback(async (challengeId: number): Promise<boolean> => {
    if (!connected || !moduleAddress) return false;

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${moduleAddress}::chess_lobby::cancel_challenge`,
          typeArguments: [],
          functionArguments: [challengeId.toString()],
        },
      });
      return true;
    } catch (err) {
      console.error('[Chess] Failed to cancel challenge:', err);
      return false;
    }
  }, [connected, moduleAddress, signAndSubmitTransaction]);

  // Make move
  const makeMove = useCallback(async (
    gameId: number,
    from: number,
    to: number,
    promotion: number = 0
  ): Promise<boolean> => {
    if (!connected || !moduleAddress) return false;

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${moduleAddress}::chess_game::make_move`,
          typeArguments: [],
          functionArguments: [
            gameId.toString(),
            from.toString(),
            to.toString(),
            promotion.toString(),
          ],
        },
      });
      return true;
    } catch (err) {
      console.error('[Chess] Failed to make move:', err);
      return false;
    }
  }, [connected, moduleAddress, signAndSubmitTransaction]);

  // Resign
  const resign = useCallback(async (gameId: number): Promise<boolean> => {
    if (!connected || !moduleAddress) return false;

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${moduleAddress}::chess_game::resign`,
          typeArguments: [],
          functionArguments: [gameId.toString()],
        },
      });
      return true;
    } catch (err) {
      console.error('[Chess] Failed to resign:', err);
      return false;
    }
  }, [connected, moduleAddress, signAndSubmitTransaction]);

  // Claim timeout
  const claimTimeout = useCallback(async (gameId: number): Promise<boolean> => {
    if (!connected || !moduleAddress) return false;

    try {
      await signAndSubmitTransaction({
        data: {
          function: `${moduleAddress}::chess_game::claim_timeout`,
          typeArguments: [],
          functionArguments: [gameId.toString()],
        },
      });
      return true;
    } catch (err) {
      console.error('[Chess] Failed to claim timeout:', err);
      return false;
    }
  }, [connected, moduleAddress, signAndSubmitTransaction]);

  // Poll for game ID after accepting challenge
  const pollForGameId = useCallback(async (
    challengeId: number,
    maxAttempts: number = 20,
    intervalMs: number = 1500
  ): Promise<number> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));

      const gameId = await getGameIdForChallenge(challengeId);
      if (gameId > 0) return gameId;

      // Also check if challenge was accepted
      const challenge = await getChallenge(challengeId);
      if (challenge?.status === CHALLENGE_STATUS_ACCEPTED) {
        const gid = await getGameIdForChallenge(challengeId);
        if (gid > 0) return gid;
      }
    }
    return 0;
  }, [getGameIdForChallenge, getChallenge]);

  return useMemo(() => ({
    // Connection state
    connected,
    address,
    hasContractAddress: Boolean(moduleAddress),

    // View functions
    isRegistered,
    getPlayerStats,
    getGameState,
    getLegalMoves,
    getOpenChallenges,
    getChallenge,
    getGameIdForChallenge,

    // Entry functions
    registerPlayer,
    createChallenge,
    acceptChallenge,
    cancelChallenge,
    makeMove,
    resign,
    claimTimeout,

    // Helpers
    pollForGameId,
  }), [
    connected,
    address,
    moduleAddress,
    isRegistered,
    getPlayerStats,
    getGameState,
    getLegalMoves,
    getOpenChallenges,
    getChallenge,
    getGameIdForChallenge,
    registerPlayer,
    createChallenge,
    acceptChallenge,
    cancelChallenge,
    makeMove,
    resign,
    claimTimeout,
    pollForGameId,
  ]);
}
