import { MovementWalletAdapterProvider } from '@moveindustries/wallet-adapter-react';
import { useGameStore } from './stores/gameStore';
import { WalletConnect } from './components/WalletConnect';
import { NFTSelector } from './components/NFTSelector';
import { HUD } from './components/HUD';
import { HintOverlay } from './components/HintOverlay';
import { Scene } from './game/Scene';
import { MultiplayerManager } from './game/MultiplayerManager';
import './App.css';

function GameContent() {
  const screen = useGameStore((state) => state.screen);

  switch (screen) {
    case 'connect':
      return <WalletConnect />;
    case 'select-nft':
      return <NFTSelector />;
    case 'playing':
      return (
        <>
          <MultiplayerManager />
          <Scene />
          <HUD />
          <HintOverlay />
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
