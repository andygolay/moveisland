import { create } from 'zustand';
import * as THREE from 'three';

export type PlayerAnimation = 'idle' | 'walk' | 'run' | 'jump' | 'wave' | 'dance' | 'sitting';

interface SeatedInfo {
  tableId: string;
  side: 'white' | 'black';
  position: { x: number; y: number; z: number };
  rotation: number;
}

interface PlayerState {
  // Position and rotation
  position: THREE.Vector3;
  rotation: number; // Y-axis rotation in radians
  velocity: THREE.Vector3;

  // Movement
  isMoving: boolean;
  isJumping: boolean;
  moveDirection: { x: number; z: number };

  // Animation
  currentAnimation: PlayerAnimation;

  // Seated state (for chess)
  isSeated: boolean;
  seatedInfo: SeatedInfo | null;

  // Actions
  setPosition: (pos: THREE.Vector3) => void;
  setRotation: (rot: number) => void;
  setVelocity: (vel: THREE.Vector3) => void;
  setIsMoving: (moving: boolean) => void;
  setIsJumping: (jumping: boolean) => void;
  setMoveDirection: (dir: { x: number; z: number }) => void;
  setCurrentAnimation: (anim: PlayerAnimation) => void;
  sitDown: (info: SeatedInfo) => void;
  standUp: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  // Initial state - spawn at Agora (center of map)
  position: new THREE.Vector3(0, 0, 0),
  rotation: 0,
  velocity: new THREE.Vector3(0, 0, 0),

  isMoving: false,
  isJumping: false,
  moveDirection: { x: 0, z: 0 },

  currentAnimation: 'idle',

  // Seated state
  isSeated: false,
  seatedInfo: null,

  // Actions
  setPosition: (pos) => set({ position: pos }),
  setRotation: (rot) => set({ rotation: rot }),
  setVelocity: (vel) => set({ velocity: vel }),
  setIsMoving: (moving) => set({ isMoving: moving }),
  setIsJumping: (jumping) => set({ isJumping: jumping }),
  setMoveDirection: (dir) => set({ moveDirection: dir }),
  setCurrentAnimation: (anim) => set({ currentAnimation: anim }),

  // Sit down at a chess table
  sitDown: (info) => set({
    isSeated: true,
    seatedInfo: info,
    position: new THREE.Vector3(info.position.x, info.position.y, info.position.z),
    rotation: info.rotation,
    currentAnimation: 'sitting',
    isMoving: false,
    velocity: new THREE.Vector3(0, 0, 0),
  }),

  // Stand up from chess table
  standUp: () => set((state) => ({
    isSeated: false,
    seatedInfo: null,
    currentAnimation: 'idle',
    // Move slightly away from the seat
    position: state.seatedInfo
      ? new THREE.Vector3(
          state.seatedInfo.position.x,
          state.seatedInfo.position.y,
          state.seatedInfo.position.z + (state.seatedInfo.side === 'white' ? -0.8 : 0.8)
        )
      : state.position,
  })),
}));
