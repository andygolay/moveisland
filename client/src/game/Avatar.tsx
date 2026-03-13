import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { AvatarBody } from './AvatarBody';
import { NFTBillboard } from './NFTBillboard';

export function Avatar() {
  const groupRef = useRef<THREE.Group>(null);
  const selectedNFT = useGameStore((state) => state.selectedNFT);
  const position = usePlayerStore((state) => state.position);
  const rotation = usePlayerStore((state) => state.rotation);

  // Debug logging
  useEffect(() => {
    console.log('[Avatar] selectedNFT:', selectedNFT);
    if (selectedNFT) {
      console.log('[Avatar] imageUrl:', selectedNFT.imageUrl);
    }
  }, [selectedNFT]);

  // Update avatar position and rotation
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.copy(position);
      groupRef.current.rotation.y = rotation;
    }
  });

  // Don't render if no NFT selected
  if (!selectedNFT) {
    console.log('[Avatar] No selectedNFT, not rendering');
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* 3D Body */}
      <AvatarBody />

      {/* NFT Billboard floating above */}
      <NFTBillboard imageUrl={selectedNFT.imageUrl} />
    </group>
  );
}
