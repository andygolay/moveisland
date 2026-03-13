import { useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '../stores/playerStore';
import { getTerrainHeight, LOCATIONS } from './Terrain';
import { sendPosition } from '../multiplayer/socket';

// Movement settings
const MOVE_SPEED = 6;
const TURN_SPEED = 4; // Rotation speed for turning
const JUMP_FORCE = 8;
const GRAVITY = 20;

// Building collision data - positions and radii
const BUILDINGS = [
  // Agora area
  { x: 8, z: 6, radius: 2.5 },
  { x: -7, z: 8, radius: 2.2 },
  { x: 10, z: -5, radius: 2.5 },
  { x: -9, z: -6, radius: 2.2 },
  // Harbor area
  { x: LOCATIONS.HARBOR.x + 8, z: LOCATIONS.HARBOR.z - 3, radius: 2.5 },
  { x: LOCATIONS.HARBOR.x - 5, z: LOCATIONS.HARBOR.z + 6, radius: 2.2 },
  { x: LOCATIONS.HARBOR.x + 4, z: LOCATIONS.HARBOR.z + 8, radius: 2.2 },
  // Amphitheater area
  { x: LOCATIONS.AMPHITHEATER.x + 7, z: LOCATIONS.AMPHITHEATER.z + 5, radius: 2.5 },
  { x: LOCATIONS.AMPHITHEATER.x - 6, z: LOCATIONS.AMPHITHEATER.z + 8, radius: 2.2 },
  // Market area
  { x: LOCATIONS.MARKET.x + 6, z: LOCATIONS.MARKET.z - 5, radius: 2.3 },
  { x: LOCATIONS.MARKET.x - 5, z: LOCATIONS.MARKET.z + 7, radius: 2.5 },
  { x: LOCATIONS.MARKET.x + 8, z: LOCATIONS.MARKET.z + 4, radius: 2.2 },
  // Lighthouse area
  { x: LOCATIONS.LIGHTHOUSE.x - 6, z: LOCATIONS.LIGHTHOUSE.z + 4, radius: 2.2 },
  // Temple columns (treated as a single large area)
  { x: LOCATIONS.TEMPLE.x, z: LOCATIONS.TEMPLE.z, radius: 8 },
];

// Check if position collides with any building
function checkBuildingCollision(x: number, z: number, playerRadius: number = 0.5): boolean {
  for (const building of BUILDINGS) {
    const dx = x - building.x;
    const dz = z - building.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < building.radius + playerRadius) {
      return true;
    }
  }
  return false;
}

// Input state
const keys: Record<string, boolean> = {};

export function PlayerController() {
  const {
    position,
    velocity,
    isJumping,
    setPosition,
    setVelocity,
    setIsMoving,
    setIsJumping,
    setRotation,
    setMoveDirection,
    setCurrentAnimation,
  } = usePlayerStore();

  // Handle key down
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keys[e.code] = true;
  }, []);

  // Handle key up
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keys[e.code] = false;
  }, []);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Update movement each frame
  useFrame((_, delta) => {
    // Clamp delta to prevent huge jumps
    const dt = Math.min(delta, 0.1);

    // Get current rotation
    let currentRotation = usePlayerStore.getState().rotation;

    // Handle turning (left/right)
    let turning = 0;
    if (keys['KeyA'] || keys['ArrowLeft']) turning += 1;  // Turn left
    if (keys['KeyD'] || keys['ArrowRight']) turning -= 1; // Turn right

    // Apply rotation
    if (turning !== 0) {
      currentRotation += turning * TURN_SPEED * dt;
      setRotation(currentRotation);
    }

    // Handle forward/backward movement (relative to facing direction)
    let moveForward = 0;
    if (keys['KeyW'] || keys['ArrowUp']) moveForward = 1;    // Forward
    if (keys['KeyS'] || keys['ArrowDown']) moveForward = -1; // Backward

    // Calculate world-space movement based on character's facing direction
    // Positive moveForward = move in the direction the character is facing (away from camera)
    const moveX = Math.sin(currentRotation) * moveForward;
    const moveZ = Math.cos(currentRotation) * moveForward;

    // Update move direction in store
    setMoveDirection({ x: moveX, z: moveZ });

    // Calculate if moving
    const isMovingNow = moveForward !== 0;
    setIsMoving(isMovingNow);

    // Update animation
    if (isMovingNow) {
      setCurrentAnimation('walk');
    } else {
      setCurrentAnimation('idle');
    }

    // Calculate new velocity
    const newVelocity = velocity.clone();

    // Horizontal movement (in the direction character is facing)
    newVelocity.x = moveX * MOVE_SPEED;
    newVelocity.z = moveZ * MOVE_SPEED;

    // Jump
    if ((keys['Space'] || keys['KeySpace']) && !isJumping) {
      newVelocity.y = JUMP_FORCE;
      setIsJumping(true);
    }

    // Apply gravity
    newVelocity.y -= GRAVITY * dt;

    // Calculate new position
    const newPosition = position.clone();
    newPosition.x += newVelocity.x * dt;
    newPosition.y += newVelocity.y * dt;
    newPosition.z += newVelocity.z * dt;

    // Get terrain height at new position
    const terrainHeight = getTerrainHeight(newPosition.x, newPosition.z);

    // Prevent walking into water (terrain height < 0.3 means water/beach edge)
    if (terrainHeight < 0.3) {
      // Revert to current position - can't walk into water
      newPosition.x = position.x;
      newPosition.z = position.z;
      newVelocity.x = 0;
      newVelocity.z = 0;
    }

    // Building collision detection
    if (checkBuildingCollision(newPosition.x, newPosition.z)) {
      // Try sliding along X axis only
      if (!checkBuildingCollision(newPosition.x, position.z)) {
        newPosition.z = position.z;
        newVelocity.z = 0;
      }
      // Try sliding along Z axis only
      else if (!checkBuildingCollision(position.x, newPosition.z)) {
        newPosition.x = position.x;
        newVelocity.x = 0;
      }
      // Can't slide, revert completely
      else {
        newPosition.x = position.x;
        newPosition.z = position.z;
        newVelocity.x = 0;
        newVelocity.z = 0;
      }
    }

    // Get terrain height at (possibly reverted) position
    const finalTerrainHeight = getTerrainHeight(newPosition.x, newPosition.z);

    // Ground collision
    if (newPosition.y <= finalTerrainHeight) {
      newPosition.y = finalTerrainHeight;
      newVelocity.y = 0;
      setIsJumping(false);
    }

    // Hard boundary check - absolute limit
    const maxRadius = 55;
    const distFromCenter = Math.sqrt(newPosition.x ** 2 + newPosition.z ** 2);
    if (distFromCenter > maxRadius) {
      const angle = Math.atan2(newPosition.z, newPosition.x);
      newPosition.x = Math.cos(angle) * maxRadius;
      newPosition.z = Math.sin(angle) * maxRadius;
    }

    // Update stores
    setPosition(newPosition);
    setVelocity(newVelocity);

    // Send position to multiplayer server
    const currentAnim = usePlayerStore.getState().currentAnimation;
    sendPosition(
      newPosition.x,
      newPosition.y,
      newPosition.z,
      currentRotation,
      currentAnim === 'idle' || currentAnim === 'walk' || currentAnim === 'run'
        ? currentAnim
        : 'idle'
    );
  });

  return null;
}
