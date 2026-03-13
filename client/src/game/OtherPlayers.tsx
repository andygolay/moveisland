import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMultiplayerStore, type OtherPlayer } from '../stores/multiplayerStore';
import { AvatarBody } from './AvatarBody';
import { NFTBillboard } from './NFTBillboard';

// Interpolation speed for smooth movement
const LERP_SPEED = 10;

interface RemotePlayerProps {
  player: OtherPlayer;
}

function RemotePlayer({ player }: RemotePlayerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPosition = useRef(new THREE.Vector3(player.x, player.y, player.z));
  const targetRotation = useRef(player.rotation);

  // Update target position when player data changes
  targetPosition.current.set(player.x, player.y, player.z);
  targetRotation.current = player.rotation;

  // Smoothly interpolate to target position
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Lerp position
    groupRef.current.position.lerp(targetPosition.current, LERP_SPEED * delta);

    // Lerp rotation (handle wraparound)
    let currentRot = groupRef.current.rotation.y;
    let targetRot = targetRotation.current;

    // Normalize angle difference
    let diff = targetRot - currentRot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    groupRef.current.rotation.y = currentRot + diff * LERP_SPEED * delta;
  });

  return (
    <group
      ref={groupRef}
      position={[player.x, player.y, player.z]}
      rotation={[0, player.rotation, 0]}
    >
      {/* Body with animation state */}
      <AvatarBody isWalking={player.animation === 'walk' || player.animation === 'run'} />

      {/* NFT Billboard */}
      <NFTBillboard imageUrl={player.nftImage} />

      {/* Player name label */}
      <PlayerLabel name={player.nftName} />
    </group>
  );
}

interface PlayerLabelProps {
  name: string;
}

function PlayerLabel({ name }: PlayerLabelProps) {
  return (
    <sprite position={[0, 3.2, 0]} scale={[2, 0.5, 1]}>
      <spriteMaterial transparent opacity={0.8}>
        <canvasTexture
          attach="map"
          image={createNameTexture(name)}
        />
      </spriteMaterial>
    </sprite>
  );
}

// Create a canvas texture for the player name
function createNameTexture(name: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;

  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.roundRect(0, 0, canvas.width, canvas.height, 8);
  ctx.fill();

  // Text
  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.slice(0, 20), canvas.width / 2, canvas.height / 2);

  return canvas;
}

export function OtherPlayers() {
  const otherPlayers = useMultiplayerStore((state) => state.otherPlayers);

  return (
    <group>
      {Array.from(otherPlayers.values()).map((player) => (
        <RemotePlayer key={player.id} player={player} />
      ))}
    </group>
  );
}
