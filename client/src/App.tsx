import { MovementWalletAdapterProvider } from '@moveindustries/wallet-adapter-react';
import { useEffect, useState } from 'react';
import { useGameStore } from './stores/gameStore';
import { WalletConnect } from './components/WalletConnect';
import { NFTSelector } from './components/NFTSelector';
import { HUD } from './components/HUD';
import { HintOverlay } from './components/HintOverlay';
import { ChessPrompt } from './components/ChessPrompt';
import { ChessGameOverlay } from './game/ChessGameView';
import { Scene } from './game/Scene';
import { MultiplayerManager } from './game/MultiplayerManager';
import './App.css';

// Loading screen component
function LoadingScreen() {
  const setScreen = useGameStore((state) => state.setScreen);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Use multiple requestAnimationFrame calls to ensure loading screen renders first
    // This gives the browser time to paint the loading UI before heavy computation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setReady(true);
      });
    });
  }, []);

  useEffect(() => {
    if (ready) {
      // Small delay to ensure loading screen is visible
      const timer = setTimeout(() => {
        setScreen('playing');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [ready, setScreen]);

  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2>Loading MOVELand...</h2>
        <p>Preparing your island adventure</p>
      </div>
    </div>
  );
}

function GameContent() {
  const screen = useGameStore((state) => state.screen);

  switch (screen) {
    case 'connect':
      return <WalletConnect />;
    case 'select-nft':
      return <NFTSelector />;
    case 'loading':
      return <LoadingScreen />;
    case 'playing':
      return (
        <>
          <MultiplayerManager />
          <Scene />
          <HUD />
          <HintOverlay />
          <ChessPrompt />
          <ChessGameOverlay />
        </>
      );
    default:
      return <WalletConnect />;
  }
}

function App() {
  return (
    <MovementWalletAdapterProvider autoConnect={false}>
      <GameContent />
    </MovementWalletAdapterProvider>
  );
}

export default App;
