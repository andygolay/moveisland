import { useEffect, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { usePlayerStore } from '../stores/playerStore';
import { getTerrainHeight, LOCATIONS } from './Terrain';
import { sendPosition } from '../multiplayer/socket';

// Movement settings
const WALK_SPEED = 6;
const RUN_SPEED = 12;
const TURN_SPEED = 4; // Rotation speed for turning
const JUMP_FORCE = 8;
const GRAVITY = 20;

// Building collision data - positions, radii, scales (for dynamic height calc)
// Roof top in model space is at Y=3.2, scaled by building scale
const BUILDING_ROOF_HEIGHT = 3.2;

const BUILDINGS = [
  // Agora area (scales: 1.2, 0.9, 1.0, 0.85)
  { x: 8, z: 6, radius: 2.5, scale: 1.2, walkableRoof: true },
  { x: -7, z: 8, radius: 2.2, scale: 0.9, walkableRoof: true },
  { x: 10, z: -5, radius: 2.5, scale: 1.0, walkableRoof: true },
  { x: -9, z: -6, radius: 2.2, scale: 0.85, walkableRoof: true },
  // Harbor area (scales: 1.1, 0.9, 0.85)
  { x: LOCATIONS.HARBOR.x + 8, z: LOCATIONS.HARBOR.z - 3, radius: 2.5, scale: 1.1, walkableRoof: true },
  { x: LOCATIONS.HARBOR.x - 5, z: LOCATIONS.HARBOR.z + 6, radius: 2.2, scale: 0.9, walkableRoof: true },
  { x: LOCATIONS.HARBOR.x + 4, z: LOCATIONS.HARBOR.z + 8, radius: 2.2, scale: 0.85, walkableRoof: true },
  // Amphitheater area (scales: 1.0, 0.9)
  { x: LOCATIONS.AMPHITHEATER.x + 7, z: LOCATIONS.AMPHITHEATER.z + 5, radius: 2.5, scale: 1.0, walkableRoof: true },
  { x: LOCATIONS.AMPHITHEATER.x - 6, z: LOCATIONS.AMPHITHEATER.z + 8, radius: 2.2, scale: 0.9, walkableRoof: true },
  // Market area (scales: 0.95, 1.0, 0.85)
  { x: LOCATIONS.MARKET.x + 6, z: LOCATIONS.MARKET.z - 5, radius: 2.3, scale: 0.95, walkableRoof: true },
  { x: LOCATIONS.MARKET.x - 5, z: LOCATIONS.MARKET.z + 7, radius: 2.5, scale: 1.0, walkableRoof: true },
  { x: LOCATIONS.MARKET.x + 8, z: LOCATIONS.MARKET.z + 4, radius: 2.2, scale: 0.85, walkableRoof: true },
  // Lighthouse area (scale: 0.9)
  { x: LOCATIONS.LIGHTHOUSE.x - 6, z: LOCATIONS.LIGHTHOUSE.z + 4, radius: 2.2, scale: 0.9, walkableRoof: true },
  // Temple columns - individual columns you can walk between (no walkable roof)
  // Front row (z = TEMPLE.z - 4)
  { x: LOCATIONS.TEMPLE.x - 6, z: LOCATIONS.TEMPLE.z - 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x - 3, z: LOCATIONS.TEMPLE.z - 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x, z: LOCATIONS.TEMPLE.z - 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x + 3, z: LOCATIONS.TEMPLE.z - 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x + 6, z: LOCATIONS.TEMPLE.z - 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  // Back row (z = TEMPLE.z + 4)
  { x: LOCATIONS.TEMPLE.x - 6, z: LOCATIONS.TEMPLE.z + 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x - 3, z: LOCATIONS.TEMPLE.z + 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x, z: LOCATIONS.TEMPLE.z + 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x + 3, z: LOCATIONS.TEMPLE.z + 4, radius: 0.6, scale: 1.3, walkableRoof: false },
  { x: LOCATIONS.TEMPLE.x + 6, z: LOCATIONS.TEMPLE.z + 4, radius: 0.6, scale: 1.3, walkableRoof: false },
];

// Calculate actual building top height (terrain + scaled roof)
function getBuildingTopHeight(building: typeof BUILDINGS[0]): number {
  const terrainHeight = getTerrainHeight(building.x, building.z);
  return terrainHeight + BUILDING_ROOF_HEIGHT * building.scale;
}

// Check if position collides with any building (considering height)
function checkBuildingCollision(
  x: number,
  z: number,
  y: number,
  playerRadius: number = 0.5
): boolean {
  for (const building of BUILDINGS) {
    const dx = x - building.x;
    const dz = z - building.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const buildingTop = getBuildingTopHeight(building);

    // Only collide if within radius AND significantly below the building top
    // (tolerance of 0.1 allows walking on roof)
    if (distance < building.radius + playerRadius && y < buildingTop - 0.1) {
      return true;
    }
  }
  return false;
}

// Check if player is currently stuck inside a building collision zone
function isInsideBuildingCollision(x: number, z: number, y: number, playerRadius: number = 0.5): boolean {
  for (const building of BUILDINGS) {
    const dx = x - building.x;
    const dz = z - building.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const buildingTop = getBuildingTopHeight(building);

    // Check if inside the collision cylinder and below roof
    if (distance < building.radius + playerRadius && y < buildingTop - 0.1) {
      return true;
    }
  }
  return false;
}

// Get the height of any building roof the player is standing on
// Uses visual building size (smaller than collision radius) so you fall at the visual edge
function getBuildingRoofHeight(x: number, z: number): number {
  for (const building of BUILDINGS) {
    // Skip columns/objects without walkable roofs
    if (!building.walkableRoof) continue;

    const dx = x - building.x;
    const dz = z - building.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    // Visual building is 3x3 base, scaled. Half-width = 1.5 * scale
    // Use slightly smaller to account for roof edge overhang (3.2 * scale / 2 = 1.6 * scale)
    const visualRadius = 1.6 * building.scale;
    if (distance < visualRadius) {
      return getBuildingTopHeight(building);
    }
  }
  return 0; // Not on any building
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

    // Check if running (holding shift)
    const isRunning = keys['ShiftLeft'] || keys['ShiftRight'];
    const currentSpeed = isRunning ? RUN_SPEED : WALK_SPEED;

    // Update animation
    if (isMovingNow) {
      setCurrentAnimation(isRunning ? 'run' : 'walk');
    } else {
      setCurrentAnimation('idle');
    }

    // Calculate new velocity
    const newVelocity = velocity.clone();

    // Horizontal movement (in the direction character is facing)
    newVelocity.x = moveX * currentSpeed;
    newVelocity.z = moveZ * currentSpeed;

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
    const currentlyStuck = isInsideBuildingCollision(position.x, position.z, position.y, 0.5);
    const wouldCollide = checkBuildingCollision(newPosition.x, newPosition.z, newPosition.y, 0.5);

    if (wouldCollide) {
      if (currentlyStuck) {
        // Player is stuck inside - only allow movement that takes them further from building centers
        let canEscape = true;
        for (const building of BUILDINGS) {
          const buildingTop = getBuildingTopHeight(building);
          if (position.y >= buildingTop - 0.1) continue; // Not colliding with this building

          const oldDist = Math.sqrt((position.x - building.x) ** 2 + (position.z - building.z) ** 2);
          const newDist = Math.sqrt((newPosition.x - building.x) ** 2 + (newPosition.z - building.z) ** 2);

          // If moving closer to any building we're stuck in, block it
          if (newDist < oldDist - 0.01) {
            canEscape = false;
            break;
          }
        }

        if (!canEscape) {
          newPosition.x = position.x;
          newPosition.z = position.z;
          newVelocity.x = 0;
          newVelocity.z = 0;
        }
      } else {
        // Player is outside but trying to move inside - block with sliding
        // Try sliding along X axis only
        if (!checkBuildingCollision(newPosition.x, position.z, newPosition.y, 0.5)) {
          newPosition.z = position.z;
          newVelocity.z = 0;
        }
        // Try sliding along Z axis only
        else if (!checkBuildingCollision(position.x, newPosition.z, newPosition.y, 0.5)) {
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
    }

    // Get terrain height at (possibly reverted) position
    const finalTerrainHeight = getTerrainHeight(newPosition.x, newPosition.z);

    // Check if standing on a building roof
    const roofHeight = getBuildingRoofHeight(newPosition.x, newPosition.z);

    // Ground collision - use the higher of terrain or building roof
    // Add small offset (0.1) to account for terrain mesh interpolation differences
    const groundLevel = Math.max(finalTerrainHeight, roofHeight) + 0.1;

    // Always ensure player is at or above ground level
    // This handles both landing from jumps and walking up hills
    if (newPosition.y <= groundLevel) {
      newPosition.y = groundLevel;
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
