import { useMemo, useState, useEffect } from 'react';
import { useChessStore } from '../stores/chessStore';
import { useGameStore } from '../stores/gameStore';
import { sendChessJoin, sendChessLeave, sendChessWatch, sendChessSetGameId, sendChessSetChallengeId } from '../multiplayer/socket';
import {
  TimeControlSelector,
  useChessContract,
  useChessGameStore,
  CHALLENGE_STATUS_ACCEPTED,
} from '../minigames/chess';

type PromptState =
  | 'idle'
  | 'showTimeControls'
  | 'registering'
  | 'creatingChallenge'
  | 'waitingForOpponent'
  | 'joiningGame'
  | 'startingGame';

export function ChessPrompt() {
  const {
    isNearTable,
    activeTableId,
    status,
    player1,
    player2,
    isInChessView,
    setIsInChessView,
    setLocalPlayerSide,
    setIsSpectating,
    serverChallengeId,
  } = useChessStore();
  const { walletAddress, displayName, selectedNFT } = useGameStore();
  const chessContract = useChessContract();
  const gameStore = useChessGameStore();

  const [promptState, setPromptState] = useState<PromptState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<number | null>(null);

  // Generate a unique session ID for this tab (stable per tab, unique across tabs)
  const sessionId = useMemo(() => {
    let id = sessionStorage.getItem('chess-session-id');
    if (!id) {
      id = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem('chess-session-id', id);
    }
    return id;
  }, []);

  const localPlayerId = sessionId;

  // Check registration on mount if connected
  useEffect(() => {
    const checkRegistration = async () => {
      if (chessContract.connected && chessContract.address) {
        const registered = await chessContract.isRegistered();
        gameStore.setIsRegistered(registered);
      }
    };
    checkRegistration();
  }, [chessContract, gameStore]);

  // Poll for challenge acceptance while waiting
  useEffect(() => {
    if (promptState !== 'waitingForOpponent' || !challengeId) return;

    const checkChallenge = async () => {
      const challenge = await chessContract.getChallenge(challengeId);

      if (challenge?.status === CHALLENGE_STATUS_ACCEPTED) {
        // Challenge was accepted! Get game ID
        const gameId = await chessContract.getGameIdForChallenge(challengeId);

        if (gameId > 0) {
          gameStore.setGameId(gameId);
          gameStore.setChallengeId(challengeId);

          // Broadcast gameId to server for spectators
          if (activeTableId) {
            sendChessSetGameId(activeTableId, gameId);
          }

          // Fetch initial game state and determine actual side from on-chain
          const state = await chessContract.getGameState(gameId);
          if (state && chessContract.address) {
            gameStore.updateFromGameState(state, chessContract.address);
            // Set side based on actual on-chain assignment (contract may assign randomly)
            const isWhite = state.white_player.toLowerCase() === chessContract.address.toLowerCase();
            setLocalPlayerSide(isWhite ? 'white' : 'black');
          } else {
            setLocalPlayerSide('white');
          }

          setIsInChessView(true);
          setPromptState('idle');
        }
      }
    };

    checkChallenge();
    const interval = setInterval(checkChallenge, 3000);
    return () => clearInterval(interval);
  }, [promptState, challengeId, chessContract, gameStore, setLocalPlayerSide, setIsInChessView]);

  // Don't show if not near table or already in chess view
  if (!isNearTable || isInChessView) return null;

  // Simple ID matching - am I player1 or player2?
  const amIPlayer1 = player1 !== null && (
    player1.odId === localPlayerId ||
    (walletAddress !== null && player1.odId === walletAddress)
  );
  const amIPlayer2 = player2 !== null && (
    player2.odId === localPlayerId ||
    (walletAddress !== null && player2.odId === walletAddress)
  );

  // Handle starting a game - show time control selector
  const handleStartGame = () => {
    if (!chessContract.connected) {
      setError('Please connect your wallet first');
      return;
    }
    if (!chessContract.hasContractAddress) {
      setError('Chess contract not configured');
      return;
    }
    setPromptState('showTimeControls');
  };

  // Handle time control selection
  const handleTimeControlSelect = async (baseSeconds: number, incrementSeconds: number) => {
    setError(null);

    // Check if registered and register if needed
    setPromptState('registering');
    let registered = await chessContract.isRegistered();
    console.log('[Chess] Player 1 registration status:', registered);

    if (!registered) {
      console.log('[Chess] Registering Player 1...');
      const success = await chessContract.registerPlayer();
      if (!success) {
        setError('Failed to register. Please approve the transaction in your wallet.');
        setPromptState('idle');
        return;
      }
      console.log('[Chess] Player 1 registration confirmed');
      gameStore.setIsRegistered(true);
    }

    // Create challenge
    setPromptState('creatingChallenge');
    const success = await chessContract.createChallenge(baseSeconds, incrementSeconds);

    if (!success) {
      setError('Failed to create challenge. Please try again.');
      setPromptState('idle');
      return;
    }

    // Get the challenge ID (query open challenges and find ours)
    const challenges = await chessContract.getOpenChallenges();
    const myChallenge = challenges.find(
      c => c.challenger.toLowerCase() === chessContract.address?.toLowerCase()
    );

    if (myChallenge) {
      setChallengeId(myChallenge.challenge_id);
      gameStore.setChallengeId(myChallenge.challenge_id);
      gameStore.setPendingChallenge(myChallenge);

      // Share challenge ID via server so joiner can accept the exact challenge
      if (activeTableId) {
        sendChessSetChallengeId(activeTableId, myChallenge.challenge_id);
      }
    }

    // Join the local game state
    if (activeTableId) {
      sendChessJoin({
        tableId: activeTableId,
        odId: localPlayerId,
        displayName: displayName || 'Player 1',
        nftImageUrl: selectedNFT?.imageUrl,
        side: 'white',
      });
    }

    setPromptState('waitingForOpponent');
  };

  // Handle canceling time control selection
  const handleCancelTimeControl = () => {
    setPromptState('idle');
    setError(null);
  };

  // Handle joining an existing game/challenge
  const handleJoinGame = async () => {
    if (!chessContract.connected) {
      setError('Please connect your wallet first');
      return;
    }

    setError(null);
    setPromptState('joiningGame');

    // Check if registered
    const registered = await chessContract.isRegistered();
    if (!registered) {
      const success = await chessContract.registerPlayer();
      if (!success) {
        setError('Failed to register. Please try again.');
        setPromptState('idle');
        return;
      }
      gameStore.setIsRegistered(true);
    }

    // Find the challenge to accept — prefer server-shared challenge ID for reliability
    let challengeIdToAccept: number | null = serverChallengeId;

    if (!challengeIdToAccept) {
      // Fallback: search open challenges
      const challenges = await chessContract.getOpenChallenges();
      const challengeToAccept = challenges.find(
        c => c.challenger.toLowerCase() !== chessContract.address?.toLowerCase()
      );
      challengeIdToAccept = challengeToAccept?.challenge_id ?? null;
    }

    if (!challengeIdToAccept) {
      setError('No challenge found to accept. The other player may still be creating the game.');
      setPromptState('idle');
      return;
    }

    // Accept the challenge
    const success = await chessContract.acceptChallenge(challengeIdToAccept);
    if (!success) {
      setError('Failed to accept challenge. Please try again.');
      setPromptState('idle');
      return;
    }

    // Poll for game ID
    const gameId = await chessContract.pollForGameId(challengeIdToAccept);

    if (gameId > 0) {
      // Join local game state
      if (activeTableId) {
        sendChessJoin({
          tableId: activeTableId,
          odId: localPlayerId,
          displayName: displayName || 'Player 2',
          nftImageUrl: selectedNFT?.imageUrl,
          side: 'black',
        });

        // Broadcast gameId to server for spectators
        sendChessSetGameId(activeTableId, gameId);
      }

      gameStore.setGameId(gameId);
      gameStore.setChallengeId(challengeIdToAccept);

      // Fetch initial game state and determine actual side from on-chain
      const state = await chessContract.getGameState(gameId);
      if (state && chessContract.address) {
        gameStore.updateFromGameState(state, chessContract.address);
        // Set side based on actual on-chain assignment (contract may assign randomly)
        const isWhite = state.white_player.toLowerCase() === chessContract.address.toLowerCase();
        setLocalPlayerSide(isWhite ? 'white' : 'black');
      } else {
        setLocalPlayerSide('black');
      }

      setIsInChessView(true);
    } else {
      setError('Game not found. Please try again.');
    }

    setPromptState('idle');
  };

  // Handle canceling while waiting
  const handleCancelWaiting = async () => {
    // Try to cancel on-chain challenge
    if (challengeId) {
      await chessContract.cancelChallenge(challengeId);
    }

    if (activeTableId) {
      sendChessLeave(localPlayerId, activeTableId);
      if (walletAddress && walletAddress !== localPlayerId) {
        sendChessLeave(walletAddress, activeTableId);
      }
    }

    setChallengeId(null);
    gameStore.setChallengeId(null);
    gameStore.setPendingChallenge(null);
    setPromptState('idle');
  };

  const handleAcceptChallenger = () => {
    setLocalPlayerSide('white');
    setIsInChessView(true);
  };

  const handleResetTable = () => {
    if (activeTableId) {
      if (player1?.odId) {
        sendChessLeave(player1.odId, activeTableId);
      }
      if (player2?.odId) {
        sendChessLeave(player2.odId, activeTableId);
      }
    }
    setPromptState('idle');
    setChallengeId(null);
  };

  // Handle watching a game as spectator
  const handleWatchGame = () => {
    if (!activeTableId) return;

    sendChessWatch({
      tableId: activeTableId,
      odId: localPlayerId,
      displayName: displayName || 'Spectator',
      nftImageUrl: selectedNFT?.imageUrl,
    });

    setIsSpectating(true);
    setIsInChessView(true);
  };

  // Show time control selector overlay
  if (promptState === 'showTimeControls') {
    return (
      <TimeControlSelector
        onSelect={handleTimeControlSelect}
        onCancel={handleCancelTimeControl}
      />
    );
  }

  // Main prompt container styles
  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '120px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0, 0, 0, 0.85)',
    border: '2px solid #C9A227',
    borderRadius: '12px',
    padding: '20px 30px',
    color: 'white',
    fontFamily: 'system-ui, sans-serif',
    textAlign: 'center',
    zIndex: 100,
    minWidth: '280px',
  };

  const primaryButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(to bottom, #C9A227, #8B7355)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.1s',
  };

  const secondaryButtonStyle: React.CSSProperties = {
    background: '#555',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    color: 'white',
    fontSize: '14px',
    cursor: 'pointer',
  };

  const greenButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(to bottom, #4CAF50, #2E7D32)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  const linkButtonStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: '12px',
    cursor: 'pointer',
    marginTop: '12px',
    textDecoration: 'underline',
  };

  // Loading states
  if (promptState === 'registering' || promptState === 'creatingChallenge' || promptState === 'joiningGame') {
    return (
      <div style={containerStyle}>
        <div style={{ fontSize: '32px', marginBottom: '10px' }}>♟️</div>
        <div style={{ fontSize: '16px', marginBottom: '10px' }}>
          {promptState === 'registering' && 'Registering player...'}
          {promptState === 'creatingChallenge' && 'Creating challenge...'}
          {promptState === 'joiningGame' && 'Joining game...'}
        </div>
        <div style={{ fontSize: '12px', color: '#aaa' }}>
          Please confirm the transaction in your wallet
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Chess icon */}
      <div style={{ fontSize: '32px', marginBottom: '10px' }}>♟️</div>

      {/* Error message */}
      {error && (
        <div style={{
          backgroundColor: '#dc2626',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          marginBottom: '12px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Empty table - show Start Game */}
      {status === 'empty' && promptState === 'idle' && (
        <>
          <div style={{ fontSize: '18px', marginBottom: '15px' }}>
            Chess
          </div>
          {!chessContract.connected ? (
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              Connect your wallet to play
            </div>
          ) : (
            <button
              onClick={handleStartGame}
              style={primaryButtonStyle}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Start Game
            </button>
          )}
        </>
      )}

      {/* I'm player1 waiting for opponent */}
      {(status === 'waiting' && amIPlayer1) || promptState === 'waitingForOpponent' ? (
        <>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Waiting for opponent...
          </div>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>
            Another player must approach the table
          </div>
          <button
            onClick={handleCancelWaiting}
            style={secondaryButtonStyle}
          >
            Cancel
          </button>
        </>
      ) : null}

      {/* Someone else is waiting - show Join Game */}
      {status === 'waiting' && !amIPlayer1 && promptState === 'idle' && (
        <>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            {player1?.displayName || 'Someone'} wants to play chess
          </div>
          {!chessContract.connected ? (
            <div style={{ fontSize: '14px', color: '#aaa' }}>
              Connect your wallet to join
            </div>
          ) : (
            <>
              <button
                onClick={handleJoinGame}
                style={greenButtonStyle}
              >
                Join Game
              </button>
              <button
                onClick={handleResetTable}
                style={linkButtonStyle}
              >
                Reset table
              </button>
            </>
          )}
        </>
      )}

      {/* Game is playing and I'm player1 - show Start Match */}
      {status === 'playing' && !isInChessView && amIPlayer1 && promptState === 'idle' && (
        <>
          <div style={{ fontSize: '18px', marginBottom: '15px' }}>
            {player2?.displayName || 'Opponent'} joined! Ready to play?
          </div>
          <button
            onClick={handleAcceptChallenger}
            style={greenButtonStyle}
          >
            Start Match
          </button>
        </>
      )}

      {/* Game is playing but I'm not in it - can watch */}
      {status === 'playing' && !isInChessView && !amIPlayer1 && !amIPlayer2 && promptState === 'idle' && (
        <>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>
            Game in progress
          </div>
          <div style={{ fontSize: '14px', color: '#aaa', marginBottom: '15px' }}>
            {player1?.displayName} vs {player2?.displayName}
          </div>
          <button
            onClick={handleWatchGame}
            style={greenButtonStyle}
          >
            Watch Game
          </button>
          <button
            onClick={handleResetTable}
            style={linkButtonStyle}
          >
            Reset abandoned game
          </button>
        </>
      )}
    </div>
  );
}
