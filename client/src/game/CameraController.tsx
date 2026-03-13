import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../stores/playerStore';

// Camera settings - Roblox-style third person (behind player)
const CAMERA_DISTANCE = 8;
const CAMERA_HEIGHT = 4;
const CAMERA_SMOOTHNESS = 8;

export function CameraController() {
  const { camera } = useThree();
  const position = usePlayerStore((state) => state.position);
  const playerRotation = usePlayerStore((state) => state.rotation);

  // Smooth camera position
  const smoothCameraPos = useRef(new THREE.Vector3(0, 5, 10));
  const smoothLookAt = useRef(new THREE.Vector3());

  // Update camera position each frame
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // Target: look at player (slightly above)
    const lookAtTarget = new THREE.Vector3(
      position.x,
      position.y + 1.2,
      position.z
    );

    // Camera position: behind the player based on player's rotation
    const cameraTarget = new THREE.Vector3(
      position.x - Math.sin(playerRotation) * CAMERA_DISTANCE,
      position.y + CAMERA_HEIGHT,
      position.z - Math.cos(playerRotation) * CAMERA_DISTANCE
    );

    // Smooth interpolation
    smoothCameraPos.current.lerp(cameraTarget, CAMERA_SMOOTHNESS * dt);
    smoothLookAt.current.lerp(lookAtTarget, CAMERA_SMOOTHNESS * dt);

    // Apply to camera
    camera.position.copy(smoothCameraPos.current);
    camera.lookAt(smoothLookAt.current);
  });

  return null;
}
