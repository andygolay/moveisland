import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../stores/playerStore';

interface AvatarBodyProps {
  isWalking?: boolean; // For remote players, pass animation state directly
  isRunning?: boolean; // For remote players, pass running state directly
}

export function AvatarBody({ isWalking, isRunning }: AvatarBodyProps) {
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const isMovingFromStore = usePlayerStore((state) => state.isMoving);
  const currentAnimation = usePlayerStore((state) => state.currentAnimation);

  // Use prop if provided (for remote players), otherwise use store (for local player)
  const isMoving = isWalking !== undefined ? isWalking : isMovingFromStore;
  const isRunningNow = isRunning !== undefined ? isRunning : currentAnimation === 'run';

  // Animation timing
  const animTime = useRef(0);

  useFrame((_, delta) => {
    // Faster animation speed when running
    const animSpeed = isRunningNow ? 18 : 10;
    animTime.current += delta * animSpeed;

    // Walking/running animation - legs swing
    if (isMoving) {
      // Wider swing when running
      const swingAmount = isRunningNow ? 0.9 : 0.7;
      const swing = Math.sin(animTime.current) * swingAmount;

      if (leftLegRef.current && rightLegRef.current) {
        leftLegRef.current.rotation.x = swing;
        rightLegRef.current.rotation.x = -swing;
      }
    } else {
      // Idle - reset legs with slight bounce
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    }
  });

  const legColor = '#000000'; // Black stick legs
  const legThickness = 0.04; // Thin stick legs

  return (
    <group>
      {/* Left Leg - pivots from hip */}
      <group position={[-0.15, 0.7, 0]} ref={leftLegRef}>
        {/* Upper leg */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <cylinderGeometry args={[legThickness, legThickness, 0.35, 8]} />
          <meshBasicMaterial color={legColor} />
        </mesh>
        {/* Lower leg (knee joint) */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[legThickness, legThickness, 0.35, 8]} />
          <meshBasicMaterial color={legColor} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.65, 0.06]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.15]} />
          <meshBasicMaterial color={legColor} />
        </mesh>
      </group>

      {/* Right Leg - pivots from hip */}
      <group position={[0.15, 0.7, 0]} ref={rightLegRef}>
        {/* Upper leg */}
        <mesh position={[0, -0.15, 0]} castShadow>
          <cylinderGeometry args={[legThickness, legThickness, 0.35, 8]} />
          <meshBasicMaterial color={legColor} />
        </mesh>
        {/* Lower leg (knee joint) */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <cylinderGeometry args={[legThickness, legThickness, 0.35, 8]} />
          <meshBasicMaterial color={legColor} />
        </mesh>
        {/* Foot */}
        <mesh position={[0, -0.65, 0.06]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.15]} />
          <meshBasicMaterial color={legColor} />
        </mesh>
      </group>

      {/* Shadow on ground */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.4, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.2} />
      </mesh>
    </group>
  );
}
