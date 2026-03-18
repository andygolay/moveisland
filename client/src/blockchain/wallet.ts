import { Movement, MovementConfig, Network } from '@moveindustries/ts-sdk';
import { MOVEMENT_NETWORK_ENV } from './constants';

// Create Movement client - network determined by VITE_MOVEMENT_NETWORK env var
export const movementConfig = new MovementConfig({
  network: MOVEMENT_NETWORK_ENV === 'testnet' ? Network.TESTNET : Network.MAINNET,
});

export const movement = new Movement(movementConfig);

// Helper to format address
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
