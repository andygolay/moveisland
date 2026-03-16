import { useWallet } from '@moveindustries/wallet-adapter-react';
import { useGameStore } from '../stores/gameStore';
import { formatAddress } from '../blockchain/wallet';
import './HUD.css';

export function HUD() {
  const { account, disconnect } = useWallet();
  const { selectedNFT, displayName, setScreen, setSelectedNFT } = useGameStore();

  const handleExit = () => {
    setScreen('select-nft');
  };

  return (
    <div className="hud-container">
      {/* Top left - Player info */}
      <div className="hud-top-left">
        {selectedNFT && (
          <div className="player-info">
            <img src={selectedNFT.imageUrl} alt={selectedNFT.name} className="avatar-preview" />
            <div className="player-details">
              <p className="player-name">{displayName || selectedNFT.name}</p>
              <p className="player-wallet">
                {account ? formatAddress(account.address.toString()) : 'Not connected'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Top right - Menu buttons */}
      <div className="hud-top-right">
        <button className="hud-button" onClick={handleExit} title="Change Avatar">
          <span>Change Avatar</span>
        </button>
        <button className="hud-button danger" onClick={() => {
          disconnect();
          setSelectedNFT(null);
          setScreen('connect');
        }} title="Disconnect">
          <span>Exit</span>
        </button>
      </div>

      {/* Bottom center - Controls hint */}
      <div className="hud-bottom-center">
        <div className="controls-hint">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</span>
          <span><kbd>Space</kbd> Jump</span>
          <span><kbd>Mouse</kbd> Look around</span>
        </div>
      </div>

      {/* Bottom left - Location */}
      <div className="hud-bottom-left">
        <div className="location-info">
          <span className="location-icon">📍</span>
          <span>MOVELand - Agora</span>
        </div>
      </div>
    </div>
  );
}
