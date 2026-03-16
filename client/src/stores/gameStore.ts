import { create } from 'zustand';

export type GameScreen = 'connect' | 'select-nft' | 'loading' | 'playing';

export interface NFTData {
  tokenId: string;
  collectionId: string;
  collectionName: string;
  name: string;
  imageUrl: string;
  uri: string;
}

interface GameState {
  // Current screen
  screen: GameScreen;
  setScreen: (screen: GameScreen) => void;

  // Wallet
  walletAddress: string | null;
  setWalletAddress: (address: string | null) => void;

  // NFTs
  ownedNFTs: NFTData[];
  setOwnedNFTs: (nfts: NFTData[]) => void;
  isLoadingNFTs: boolean;
  setIsLoadingNFTs: (loading: boolean) => void;

  // Selected avatar
  selectedNFT: NFTData | null;
  setSelectedNFT: (nft: NFTData | null) => void;

  // Player display name
  displayName: string;
  setDisplayName: (name: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  // Screen
  screen: 'connect',
  setScreen: (screen) => set({ screen }),

  // Wallet
  walletAddress: null,
  setWalletAddress: (address) => set({ walletAddress: address }),

  // NFTs
  ownedNFTs: [],
  setOwnedNFTs: (nfts) => set({ ownedNFTs: nfts }),
  isLoadingNFTs: false,
  setIsLoadingNFTs: (loading) => set({ isLoadingNFTs: loading }),

  // Selected avatar
  selectedNFT: null,
  setSelectedNFT: (nft) => set({ selectedNFT: nft }),

  // Player display name
  displayName: '',
  setDisplayName: (name) => set({ displayName: name }),
}));
