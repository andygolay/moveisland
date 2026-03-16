import { useEffect, useState } from 'react';
import { useWallet } from '@moveindustries/wallet-adapter-react';
import { useGameStore } from '../stores/gameStore';
import { fetchOwnedNFTs } from '../blockchain/nft';
import type { NFTData } from '../stores/gameStore';
import './NFTSelector.css';

export function NFTSelector() {
  const { account, disconnect } = useWallet();
  const {
    ownedNFTs,
    setOwnedNFTs,
    isLoadingNFTs,
    setIsLoadingNFTs,
    selectedNFT,
    setSelectedNFT,
    setScreen,
    displayName,
    setDisplayName,
  } = useGameStore();

  const [error, setError] = useState<string | null>(null);

  // Fetch NFTs when component mounts
  useEffect(() => {
    async function loadNFTs() {
      if (!account?.address) return;

      setIsLoadingNFTs(true);
      setError(null);

      try {
        const nfts = await fetchOwnedNFTs(account.address.toString());
        setOwnedNFTs(nfts);

        if (nfts.length === 0) {
          setError('No supported NFTs found. You need a MoveLady or Moveously NFT to play.');
        }
      } catch (err) {
        console.error('Error loading NFTs:', err);
        setError('Failed to load NFTs. Please try again.');
      } finally {
        setIsLoadingNFTs(false);
      }
    }

    loadNFTs();
  }, [account, setOwnedNFTs, setIsLoadingNFTs]);

  const handleSelectNFT = (nft: NFTData) => {
    setSelectedNFT(nft);
  };

  const handleEnterWorld = () => {
    if (selectedNFT) {
      setScreen('loading');
    }
  };

  // Demo mode - use placeholder NFT for testing
  const handleDemoMode = () => {
    const demoNFT: NFTData = {
      tokenId: 'demo-1',
      collectionId: 'demo',
      collectionName: 'Demo',
      name: 'Demo Explorer',
      // Using a reliable placeholder
      imageUrl: 'https://via.placeholder.com/256/FFD93D/1E5F8A?text=M',
      uri: '',
    };
    setSelectedNFT(demoNFT);
    setScreen('loading');
  };

  return (
    <div className="nft-selector-container">
      <div className="nft-selector-card">
        <h1>Choose Your Avatar</h1>
        <p className="subtitle">Select an NFT to represent you in the game</p>

        {isLoadingNFTs && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading your NFTs...</p>
          </div>
        )}

        {error && !isLoadingNFTs && (
          <div className="error-message">
            <p>{error}</p>
            <button className="demo-button" onClick={handleDemoMode}>
              Try Demo Mode
            </button>
          </div>
        )}

        {!isLoadingNFTs && ownedNFTs.length > 0 && (
          <div className="nft-grid">
            {ownedNFTs.map((nft) => (
              <div
                key={nft.tokenId}
                className={`nft-card ${selectedNFT?.tokenId === nft.tokenId ? 'selected' : ''}`}
                onClick={() => handleSelectNFT(nft)}
              >
                <div className="nft-image-container">
                  {nft.imageUrl && nft.imageUrl.trim() !== '' ? (
                    <img src={nft.imageUrl} alt={nft.name} className="nft-image" />
                  ) : (
                    <div className="nft-placeholder">{nft.name.charAt(0)}</div>
                  )}
                </div>
                <div className="nft-info">
                  <p className="nft-name">{nft.name}</p>
                  <p className="nft-collection">{nft.collectionName}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="actions">
          {selectedNFT && (
            <div className="selected-preview">
              {selectedNFT.imageUrl && selectedNFT.imageUrl.trim() !== '' ? (
                <img src={selectedNFT.imageUrl} alt={selectedNFT.name} />
              ) : (
                <div className="nft-placeholder large">{selectedNFT.name.charAt(0)}</div>
              )}
              <p>{selectedNFT.name}</p>
            </div>
          )}

          <div className="name-input-section">
            <label htmlFor="displayName">Display Name</label>
            <input
              type="text"
              id="displayName"
              placeholder="Enter your name (e.g. andy.move)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
            />
          </div>

          <button
            className="enter-button"
            onClick={handleEnterWorld}
            disabled={!selectedNFT}
          >
            Enter MOVELand
          </button>

          <button
            className="back-button"
            onClick={() => {
              disconnect();
              setScreen('connect');
            }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
