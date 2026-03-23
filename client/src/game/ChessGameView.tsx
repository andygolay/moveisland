import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useChessStore } from '../stores/chessStore';
import { CHESS_TABLE_POSITION } from './ChessTable';
import { getTerrainHeight } from './Terrain';
import { sendChessStopWatching } from '../multiplayer/socket';
import * as THREE from 'three';
import {
  ChessBoard,
  GameTimer,
  PromotionModal,
  GameOverModal,
  CapturedPieces,
  useChessContract,
  useChessGameStore,
  COLOR_WHITE,
  COLOR_BLACK,
  PIECE_PAWN,
  isGameOver,
  GAME_STATUS_ACTIVE,
} from '../minigames/chess';

// This component handles the overhead camera view during chess game
export function ChessGameCamera() {
  const { isInChessView, localPlayerSide } = useChessStore();
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());

  const tableGroundY = useMemo(() =>
    getTerrainHeight(CHESS_TABLE_POSITION.x, CHESS_TABLE_POSITION.z),
    []
  );

  useFrame(() => {
    if (!isInChessView) return;

    // Set camera position above the chess table
    // Offset slightly based on player side so they see "their" pieces closer
    const sideOffset = localPlayerSide === 'white' ? -1 : 1;

    targetPosition.current.set(
      CHESS_TABLE_POSITION.x,
      tableGroundY + 4, // 4 units above table
      CHESS_TABLE_POSITION.z + sideOffset * 2
    );

    targetLookAt.current.set(
      CHESS_TABLE_POSITION.x,
      tableGroundY + 0.6, // Look at table surface
      CHESS_TABLE_POSITION.z
    );

    // Smoothly interpolate camera
    camera.position.lerp(targetPosition.current, 0.05);
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    currentLookAt.add(camera.position);
    currentLookAt.lerp(targetLookAt.current, 0.05);
    camera.lookAt(targetLookAt.current);
  });

  return null;
}

// Chess board overlay UI during game - Full screen chess game view
export function ChessGameOverlay() {
  const {
    isInChessView,
    player1,
    player2,
    spectators,
    isSpectating,
    activeTableId,
    serverGameId,
    setIsInChessView,
    leaveGame,
    resetGame,
    setIsSpectating,
    localPlayerSide,
  } = useChessStore();
  const chessContract = useChessContract();
  const gameStore = useChessGameStore();

  const {
    gameId,
    board,
    selectedSquare,
    legalMoves,
    playerColor,
    whiteTimeMs,
    blackTimeMs,
    lastMoveTimestamp,
    status,
    activeColor,
    isMyTurn,
    capturedByWhite,
    capturedByBlack,
    promotionMove,
    isLoading,
    error,
    whitePlayer,
    blackPlayer,
    whitePlayerStats,
    blackPlayerStats,
    setSelectedSquare,
    setLegalMoves,
    setPromotionMove,
    setIsLoading,
    setError,
    updateFromGameState,
    reset: resetGameStore,
  } = gameStore;

  // Poll for game state
  // Use gameId for players, serverGameId for spectators
  const effectiveGameId = gameId || serverGameId;

  useEffect(() => {
    if (!isInChessView || !effectiveGameId) return;

    const fetchGameState = async () => {
      const state = await chessContract.getGameState(effectiveGameId);
      if (state) {
        // For spectators, use player1's address as reference for updateFromGameState
        const playerAddress = isSpectating ? player1?.odId : chessContract.address;
        if (playerAddress) {
          updateFromGameState(state, playerAddress);
        }
      }
    };

    fetchGameState();
    const interval = setInterval(fetchGameState, 5000);
    return () => clearInterval(interval);
  }, [isInChessView, effectiveGameId, chessContract, updateFromGameState, isSpectating, player1]);

  // Auto-claim timeout
  useEffect(() => {
    if (!isInChessView || !gameId || !playerColor || status !== GAME_STATUS_ACTIVE) return;

    const checkTimeout = async () => {
      const now = Date.now();
      const elapsed = now - lastMoveTimestamp;
      const isOpponentsTurn = activeColor !== playerColor;

      if (!isOpponentsTurn) return;

      const opponentTimeMs = playerColor === COLOR_WHITE ? blackTimeMs : whiteTimeMs;
      const opponentRemainingTime = opponentTimeMs - elapsed;

      if (opponentRemainingTime <= 0) {
        const success = await chessContract.claimTimeout(gameId);
        if (success) {
          const state = await chessContract.getGameState(gameId);
          if (state && chessContract.address) {
            updateFromGameState(state, chessContract.address);
          }
        }
      }
    };

    const interval = setInterval(checkTimeout, 3000);
    return () => clearInterval(interval);
  }, [isInChessView, gameId, playerColor, status, activeColor, lastMoveTimestamp, whiteTimeMs, blackTimeMs, chessContract, updateFromGameState]);

  // Handle square click
  const handleSquareClick = useCallback(async (square: number) => {
    if (!gameId || !isMyTurn || isLoading || isGameOver(status)) return;

    const piece = board[square];

    // If clicking on own piece, select it
    if (piece.color === playerColor) {
      setSelectedSquare(square);
      setIsLoading(true);
      const moves = await chessContract.getLegalMoves(gameId, square);
      setLegalMoves(moves);
      setIsLoading(false);
      return;
    }

    // If a piece is selected and clicking on a legal move target
    if (selectedSquare !== null && legalMoves.includes(square)) {
      const fromPiece = board[selectedSquare];

      // Check for pawn promotion
      const isPawn = fromPiece.piece_type === PIECE_PAWN;
      const toRank = Math.floor(square / 8);
      const isPromotionRank =
        (playerColor === COLOR_WHITE && toRank === 0) ||
        (playerColor === COLOR_BLACK && toRank === 7);

      if (isPawn && isPromotionRank) {
        setPromotionMove({ from: selectedSquare, to: square });
        return;
      }

      await executeMove(selectedSquare, square, 0);
    } else {
      // Deselect
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  }, [gameId, isMyTurn, isLoading, status, board, playerColor, selectedSquare, legalMoves, chessContract, setSelectedSquare, setLegalMoves, setPromotionMove, setIsLoading]);

  // Execute move
  const executeMove = async (from: number, to: number, promotion: number) => {
    if (!gameId) return;

    setIsLoading(true);
    setError(null);

    // Debug: Check registration status for both players before making move
    if (whitePlayer && blackPlayer) {
      const whiteRegistered = await chessContract.isRegistered(whitePlayer);
      const blackRegistered = await chessContract.isRegistered(blackPlayer);
      console.log('[Chess] Pre-move registration check:');
      console.log(`  White (${whitePlayer}): ${whiteRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`);
      console.log(`  Black (${blackPlayer}): ${blackRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`);

      if (!whiteRegistered || !blackRegistered) {
        setError(`Player not registered: ${!whiteRegistered ? 'White' : ''} ${!blackRegistered ? 'Black' : ''}`);
        setIsLoading(false);
        return;
      }
    }

    const success = await chessContract.makeMove(gameId, from, to, promotion);

    if (success) {
      setSelectedSquare(null);
      setLegalMoves([]);
      setPromotionMove(null);

      // Refresh game state
      const state = await chessContract.getGameState(gameId);
      if (state && chessContract.address) {
        updateFromGameState(state, chessContract.address);
      }
    } else {
      setError('Failed to make move');
    }

    setIsLoading(false);
  };

  // Handle promotion selection
  const handlePromotion = (pieceType: number) => {
    if (promotionMove) {
      executeMove(promotionMove.from, promotionMove.to, pieceType);
    }
  };

  // Handle resign
  const handleResign = async () => {
    if (!gameId) return;
    setIsLoading(true);
    await chessContract.resign(gameId);
    const state = await chessContract.getGameState(gameId);
    if (state && chessContract.address) {
      updateFromGameState(state, chessContract.address);
    }
    setIsLoading(false);
  };

  // Handle claim timeout
  const handleClaimTimeout = async () => {
    if (!gameId) return;
    setIsLoading(true);
    await chessContract.claimTimeout(gameId);
    const state = await chessContract.getGameState(gameId);
    if (state && chessContract.address) {
      updateFromGameState(state, chessContract.address);
    }
    setIsLoading(false);
  };

  // Handle leaving game / closing overlay
  const handleClose = () => {
    // When game is over, fully reset the table so it doesn't show "wants to play"
    // When game is still active (resign mid-game), just remove this player
    if (isGameOver(status)) {
      resetGame();
    } else {
      const localPlayerId = localPlayerSide === 'white' ? player1?.odId : player2?.odId;
      if (localPlayerId) {
        leaveGame(localPlayerId);
      }
    }
    setIsInChessView(false);
    resetGameStore();
  };

  // Handle spectator leaving
  const handleStopWatching = () => {
    if (activeTableId) {
      // Get session ID for spectator
      const sessionId = sessionStorage.getItem('chess-session-id');
      if (sessionId) {
        sendChessStopWatching(sessionId, activeTableId);
      }
    }
    setIsSpectating(false);
    setIsInChessView(false);
    resetGameStore();
  };

  // Identify which chessStore player is the local player by session ID
  // (player1/player2 are ordered by who joined first, NOT by on-chain color)
  // Must be before the early return to satisfy React's rules of hooks
  const localSessionId = useMemo(() => sessionStorage.getItem('chess-session-id'), []);

  if (!isInChessView) return null;

  const gameIsOver = isGameOver(status);

  // For spectators, show from white's perspective (white at bottom, black at top)
  // For players, show their color at bottom
  const effectivePlayerColor = isSpectating ? COLOR_WHITE : (playerColor || COLOR_WHITE);

  const isLocalPlayer1 = player1?.odId === localSessionId;
  const localChessPlayer = isLocalPlayer1 ? player1 : player2;
  const remoteChessPlayer = isLocalPlayer1 ? player2 : player1;

  const opponentColor = effectivePlayerColor === COLOR_WHITE ? COLOR_BLACK : COLOR_WHITE;
  const opponentPlayer = effectivePlayerColor === COLOR_WHITE ? blackPlayer : whitePlayer;
  const opponentStats = effectivePlayerColor === COLOR_WHITE ? blackPlayerStats : whitePlayerStats;
  const myStats = effectivePlayerColor === COLOR_WHITE ? whitePlayerStats : blackPlayerStats;
  const myTimeMs = effectivePlayerColor === COLOR_WHITE ? whiteTimeMs : blackTimeMs;
  const opponentTimeMs = effectivePlayerColor === COLOR_WHITE ? blackTimeMs : whiteTimeMs;
  // Use session-based player matching for display names/NFTs (not color-based)
  const myNft = isSpectating ? player1?.nftImageUrl : localChessPlayer?.nftImageUrl;
  const opponentNft = isSpectating ? player2?.nftImageUrl : remoteChessPlayer?.nftImageUrl;
  const myDisplayName = isSpectating
    ? player1?.displayName || formatAddress(whitePlayer || '')
    : localChessPlayer?.displayName;
  const opponentDisplayName = isSpectating
    ? player2?.displayName || formatAddress(blackPlayer || '')
    : remoteChessPlayer?.displayName;

  // Styles
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#111827',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const playerBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 20px',
    backgroundColor: '#1f2937',
  };

  const playerInfoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const avatarStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: '50%',
    objectFit: 'cover',
    border: '2px solid #374151',
  };

  const mainAreaStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '16px',
  };

  const boardContainerStyle: React.CSSProperties = {
    maxWidth: '480px',
    maxHeight: '480px',
    width: '100%',
    aspectRatio: '1',
  };

  const controlsStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    padding: '12px',
  };

  const buttonStyle: React.CSSProperties = {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.15s',
  };

  const resignButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#dc2626',
    color: 'white',
  };

  const timeoutButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#374151',
    color: 'white',
  };

  const backButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#4b5563',
    color: 'white',
  };

  const spectatorBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '12px',
    right: '12px',
    backgroundColor: '#6366f1',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const spectatorsListStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '80px',
    right: '12px',
    backgroundColor: 'rgba(31, 41, 55, 0.9)',
    borderRadius: '8px',
    padding: '8px 12px',
    maxWidth: '180px',
  };

  // For spectators, show a neutral indicator; for players, green when their turn
  const turnIndicatorBg = isSpectating
    ? (activeColor === COLOR_WHITE ? '#3b82f6' : '#6366f1')
    : (isMyTurn ? '#059669' : '#374151');

  const turnIndicatorStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: turnIndicatorBg,
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
  };

  const errorStyle: React.CSSProperties = {
    textAlign: 'center',
    padding: '8px',
    backgroundColor: '#dc2626',
    color: 'white',
    fontSize: '12px',
  };

  return (
    <div style={containerStyle}>
      {/* Opponent bar (top) */}
      <div style={playerBarStyle}>
        <div style={playerInfoStyle}>
          {opponentNft ? (
            <img src={opponentNft} alt="" style={avatarStyle} />
          ) : (
            <div style={{ ...avatarStyle, backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '20px' }}>
                {opponentColor === COLOR_WHITE ? '♔' : '♚'}
              </span>
            </div>
          )}
          <div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
              {opponentDisplayName || formatAddress(opponentPlayer || '')}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '12px' }}>
              {opponentColor === COLOR_WHITE ? 'White' : 'Black'}
              {opponentStats && ` • ${opponentStats.rating} rating`}
            </div>
          </div>
        </div>
        <GameTimer
          timeMs={opponentTimeMs}
          isActive={status === GAME_STATUS_ACTIVE && activeColor === opponentColor}
          lastMoveTimestamp={lastMoveTimestamp}
        />
      </div>

      {/* Error message */}
      {error && <div style={errorStyle}>{error}</div>}

      {/* Main game area */}
      <div style={mainAreaStyle}>
        {/* Captured pieces (opponent's pieces captured by me) */}
        <CapturedPieces
          capturedByWhite={capturedByWhite}
          capturedByBlack={capturedByBlack}
          orientation="vertical"
        />

        {/* Chess board */}
        <div style={boardContainerStyle}>
          <ChessBoard
            board={board}
            selectedSquare={isSpectating ? null : selectedSquare}
            legalMoves={isSpectating ? [] : legalMoves}
            playerColor={playerColor || COLOR_WHITE}
            onSquareClick={isSpectating ? () => {} : handleSquareClick}
            disabled={isSpectating || !isMyTurn || isLoading || gameIsOver}
          />
        </div>

        {/* Empty space for symmetry */}
        <div style={{ width: '60px' }} />
      </div>

      {/* Turn indicator */}
      {!gameIsOver && (
        <div style={turnIndicatorStyle}>
          {isSpectating
            ? (activeColor === COLOR_WHITE ? "White's turn" : "Black's turn")
            : (isMyTurn ? "Your turn" : "Opponent's turn")
          }
          {isLoading && ' • Processing...'}
        </div>
      )}

      {/* Player bar (bottom - me) */}
      <div style={playerBarStyle}>
        <div style={playerInfoStyle}>
          {myNft ? (
            <img src={myNft} alt="" style={avatarStyle} />
          ) : (
            <div style={{ ...avatarStyle, backgroundColor: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'white', fontSize: '20px' }}>
                {playerColor === COLOR_WHITE ? '♔' : '♚'}
              </span>
            </div>
          )}
          <div>
            <div style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>
              {myDisplayName || (isSpectating ? 'White' : 'You')}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '12px' }}>
              {effectivePlayerColor === COLOR_WHITE ? 'White' : 'Black'}
              {myStats && ` • ${myStats.rating} rating`}
            </div>
          </div>
        </div>
        <GameTimer
          timeMs={myTimeMs}
          isActive={status === GAME_STATUS_ACTIVE && activeColor === effectivePlayerColor}
          lastMoveTimestamp={lastMoveTimestamp}
        />
      </div>

      {/* Game controls */}
      {!gameIsOver && status === GAME_STATUS_ACTIVE && !isSpectating && (
        <div style={controlsStyle}>
          <button
            style={resignButtonStyle}
            onClick={handleResign}
            disabled={isLoading}
          >
            Resign
          </button>
          <button
            style={timeoutButtonStyle}
            onClick={handleClaimTimeout}
            disabled={isLoading}
          >
            Claim Timeout
          </button>
        </div>
      )}

      {/* Spectator badge and back button */}
      {isSpectating && (
        <>
          <div style={spectatorBadgeStyle}>
            👁️ Watching
          </div>
          <div style={controlsStyle}>
            <button
              style={backButtonStyle}
              onClick={handleStopWatching}
            >
              Back to World
            </button>
          </div>
        </>
      )}

      {/* Spectators list */}
      {spectators.length > 0 && (
        <div style={spectatorsListStyle}>
          <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
            👁️ {spectators.length} watching
          </div>
          {spectators.slice(0, 5).map((spec) => (
            <div key={spec.odId} style={{ color: 'white', fontSize: '12px', padding: '2px 0' }}>
              {spec.displayName}
            </div>
          ))}
          {spectators.length > 5 && (
            <div style={{ color: '#6b7280', fontSize: '11px' }}>
              +{spectators.length - 5} more
            </div>
          )}
        </div>
      )}

      {/* Promotion modal */}
      {promotionMove && playerColor && (
        <PromotionModal
          playerColor={playerColor}
          onSelect={handlePromotion}
          onCancel={() => setPromotionMove(null)}
        />
      )}

      {/* Game over modal */}
      {gameIsOver && (
        <GameOverModal
          status={status}
          playerColor={playerColor}
          onClose={handleClose}
          whiteRating={whitePlayerStats?.rating}
          blackRating={blackPlayerStats?.rating}
        />
      )}
    </div>
  );
}

// Helper to format addresses
function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
