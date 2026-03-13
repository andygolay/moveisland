import { useWallet } from '@moveindustries/wallet-adapter-react';
import { useEffect } from 'react';
import { formatAddress } from '../blockchain/wallet';
import { useGameStore } from '../stores/gameStore';
import './WalletConnect.css';

export function WalletConnect() {
  const { connect, disconnect, account, connected, wallets } = useWallet();
  const { setWalletAddress, setScreen, setSelectedNFT } = useGameStore();

  // Update game store when wallet connects
  useEffect(() => {
    console.log('Wallet state changed - connected:', connected, 'account:', account?.address?.toString());
    if (connected && account?.address) {
      console.log('Wallet connected! Navigating to NFT selection...');
      setWalletAddress(account.address.toString());
      setScreen('select-nft');
    } else {
      setWalletAddress(null);
    }
  }, [connected, account, setWalletAddress, setScreen]);

  const handleConnect = async (walletName: string) => {
    console.log('Attempting to connect wallet:', walletName);
    try {
      await connect(walletName);
      console.log('Connect resolved, connected:', connected, 'account:', account);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="wallet-connect-container">
      <div className="wallet-connect-card">
        <div className="game-logo">
          <h1>MOVE</h1>
          <h2>Land</h2>
        </div>

        <p className="subtitle">Connect your wallet to drop in</p>

        <div className="wallet-list">
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              className="wallet-button"
              onClick={() => handleConnect(wallet.name)}
            >
              {wallet.icon && (
                <img src={wallet.icon} alt={wallet.name} className="wallet-icon" />
              )}
              <span>{wallet.name}</span>
            </button>
          ))}

          {wallets.length === 0 && (
            <p className="no-wallets">
              No wallets detected. Please install{' '}
              <a href="https://petra.app/" target="_blank" rel="noopener noreferrer">
                Petra
              </a>{' '}
              or another Movement-compatible wallet.
            </p>
          )}
        </div>

        {connected && account && (
          <div className="connected-info">
            <p>Connected: {formatAddress(account.address.toString())}</p>
            <button className="disconnect-button" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}

        <div className="demo-section">
          <p>Or try without a wallet:</p>
          <button
            className="demo-button"
            onClick={() => {
              // Set a demo NFT and go straight to playing
              setSelectedNFT({
                tokenId: 'demo-1',
                collectionId: 'demo',
                collectionName: 'Demo',
                name: 'Demo Explorer',
                imageUrl: 'https://i.imgur.com/ZXBtVw7.png',
                uri: '',
              });
              setScreen('playing');
            }}
          >
            Play Demo
          </button>
        </div>

        <div className="footer-info">
          <p>Powered by Movement Network</p>
        </div>
      </div>
    </div>
  );
}
