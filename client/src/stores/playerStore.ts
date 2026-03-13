import { create } from 'zustand';
import * as THREE from 'three';

export type PlayerAnimation = 'idle' | 'walk' | 'run' | 'jump' | 'wave' | 'dance';

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

  // Actions
  setPosition: (pos: THREE.Vector3) => void;
  setRotation: (rot: number) => void;
  setVelocity: (vel: THREE.Vector3) => void;
  setIsMoving: (moving: boolean) => void;
  setIsJumping: (jumping: boolean) => void;
  setMoveDirection: (dir: { x: number; z: number }) => void;
  setCurrentAnimation: (anim: PlayerAnimation) => void;
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

  // Actions
  setPosition: (pos) => set({ position: pos }),
  setRotation: (rot) => set({ rotation: rot }),
  setVelocity: (vel) => set({ velocity: vel }),
  setIsMoving: (moving) => set({ isMoving: moving }),
  setIsJumping: (jumping) => set({ isJumping: jumping }),
  setMoveDirection: (dir) => set({ moveDirection: dir }),
  setCurrentAnimation: (anim) => set({ currentAnimation: anim }),
}));
