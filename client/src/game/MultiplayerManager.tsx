import { useEffect } from 'react';
import { useGameStore } from '../stores/gameStore';
import { connectToServer, disconnectFromServer } from '../multiplayer/socket';

export function MultiplayerManager() {
  const walletAddress = useGameStore((state) => state.walletAddress);
  const selectedNFT = useGameStore((state) => state.selectedNFT);
  const displayName = useGameStore((state) => state.displayName);
  const screen = useGameStore((state) => state.screen);

  useEffect(() => {
    // Connect when we have wallet, NFT, and are in playing state
    if (screen === 'playing' && walletAddress && selectedNFT) {
      console.log('[MultiplayerManager] Connecting to server...');
      // Use displayName if set, otherwise fall back to NFT name
      const playerName = displayName.trim() || selectedNFT.name;
      connectToServer(
        walletAddress,
        selectedNFT.imageUrl,
        playerName
      );
    }

    // Cleanup on unmount or when leaving game
    return () => {
      disconnectFromServer();
    };
  }, [screen, walletAddress, selectedNFT]);

  return null;
}
