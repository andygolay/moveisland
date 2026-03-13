import { Movement, MovementConfig, Network } from '@moveindustries/ts-sdk';
import { MOVEMENT_NETWORK } from './constants';

// Create Movement client configured for mainnet
export const movementConfig = new MovementConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_NETWORK.rpcUrl,
  indexer: MOVEMENT_NETWORK.indexerUrl,
});

export const movement = new Movement(movementConfig);

// Helper to format address
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
