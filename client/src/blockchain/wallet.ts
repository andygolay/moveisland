import { Movement, MovementConfig, Network } from '@moveindustries/ts-sdk';
import { MOVEMENT_NODE_URL, MOVEMENT_INDEXER_URL } from './constants';

// Create Movement client - use Network.CUSTOM to avoid SDK overriding URLs
export const movementConfig = new MovementConfig({
  network: Network.CUSTOM,
  fullnode: MOVEMENT_NODE_URL,
  indexer: MOVEMENT_INDEXER_URL,
});

export const movement = new Movement(movementConfig);

// Helper to format address
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
