import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { usePlayerStore } from '../stores/playerStore';
import { getTerrainHeight, LOCATIONS } from './Terrain';
import { getTreeCollisionData, getBushCollisionData } from './Buildings';
import { CHESS_TABLES, CHESS_INTERACTION_RADIUS, getChessTableCollisions, getSeatPosition } from './ChessTable';
import { useChessStore } from '../stores/chessStore';
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
  // Collision radius = visual radius (2.0 * scale) + 0.3 buffer
  { x: 8, z: 6, radius: 2.7, scale: 1.2, walkableRoof: true },
  { x: -7, z: 8, radius: 2.1, scale: 0.9, walkableRoof: true },
  { x: 10, z: -5, radius: 2.3, scale: 1.0, walkableRoof: true },
  { x: -9, z: -6, radius: 2.0, scale: 0.85, walkableRoof: true },
  // Harbor area (scales: 1.1, 0.9, 0.85)
  { x: LOCATIONS.HARBOR.x + 8, z: LOCATIONS.HARBOR.z - 3, radius: 2.5, scale: 1.1, walkableRoof: true },
  { x: LOCATIONS.HARBOR.x - 5, z: LOCATIONS.HARBOR.z + 6, radius: 2.1, scale: 0.9, walkableRoof: true },
  { x: LOCATIONS.HARBOR.x + 4, z: LOCATIONS.HARBOR.z + 8, radius: 2.0, scale: 0.85, walkableRoof: true },
  // Amphitheater area (scales: 1.0, 0.9)
  { x: LOCATIONS.AMPHITHEATER.x + 7, z: LOCATIONS.AMPHITHEATER.z + 5, radius: 2.3, scale: 1.0, walkableRoof: true },
  { x: LOCATIONS.AMPHITHEATER.x - 6, z: LOCATIONS.AMPHITHEATER.z + 8, radius: 2.1, scale: 0.9, walkableRoof: true },
  // Market area (scales: 0.95, 1.0, 0.85)
  { x: LOCATIONS.MARKET.x + 6, z: LOCATIONS.MARKET.z - 5, radius: 2.2, scale: 0.95, walkableRoof: true },
  { x: LOCATIONS.MARKET.x - 5, z: LOCATIONS.MARKET.z + 7, radius: 2.3, scale: 1.0, walkableRoof: true },
  { x: LOCATIONS.MARKET.x + 8, z: LOCATIONS.MARKET.z + 4, radius: 2.0, scale: 0.85, walkableRoof: true },
  // Lighthouse area (scale: 0.9)
  { x: LOCATIONS.LIGHTHOUSE.x - 6, z: LOCATIONS.LIGHTHOUSE.z + 4, radius: 2.1, scale: 0.9, walkableRoof: true },
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
    // Visual building is larger than originally estimated
    // Use 2.0 * scale to match the actual visible building edge
    const visualRadius = 2.0 * building.scale;
    if (distance < visualRadius) {
      return getBuildingTopHeight(building);
    }
  }
  return 0; // Not on any building
}

// Check collision with vegetation (trees and bushes)
// Only collide with tree trunks when below the canopy top
function checkVegetationCollision(
  x: number,
  z: number,
  y: number,
  playerRadius: number,
  treeData: { x: number; z: number; radius: number; topHeight: number; canopyRadius: number }[],
  bushData: { x: number; z: number; radius: number }[]
): { collides: boolean; pushX: number; pushZ: number } {
  // Check trees - only collide when below tree top
  for (const tree of treeData) {
    const dx = x - tree.x;
    const dz = z - tree.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const minDist = tree.radius + playerRadius;

    // Only block if player is below the tree top (with small tolerance)
    if (distance < minDist && distance > 0.01 && y < tree.topHeight - 0.2) {
      // Calculate push direction
      const overlap = minDist - distance;
      const pushX = (dx / distance) * overlap;
      const pushZ = (dz / distance) * overlap;
      return { collides: true, pushX, pushZ };
    }
  }

  // Check bushes (always collide - can't stand on bushes)
  for (const bush of bushData) {
    const dx = x - bush.x;
    const dz = z - bush.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const minDist = bush.radius + playerRadius;

    if (distance < minDist && distance > 0.01) {
      const overlap = minDist - distance;
      const pushX = (dx / distance) * overlap;
      const pushZ = (dz / distance) * overlap;
      return { collides: true, pushX, pushZ };
    }
  }

  return { collides: false, pushX: 0, pushZ: 0 };
}

// Get the height of any tree canopy the player is standing on
function getTreeTopHeight(
  x: number,
  z: number,
  treeData: { x: number; z: number; radius: number; topHeight: number; canopyRadius: number }[]
): number {
  for (const tree of treeData) {
    const dx = x - tree.x;
    const dz = z - tree.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if within the canopy radius (walkable area on top of tree)
    if (distance < tree.canopyRadius) {
      return tree.topHeight;
    }
  }
  return 0; // Not on any tree
}

// Check collision with chess tables and seats
function checkChessTableCollision(
  x: number,
  z: number,
  playerRadius: number,
  tableCollisions: { x: number; z: number; radius: number }[]
): { collides: boolean; pushX: number; pushZ: number } {
  for (const obstacle of tableCollisions) {
    const dx = x - obstacle.x;
    const dz = z - obstacle.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const minDist = obstacle.radius + playerRadius;

    if (distance < minDist && distance > 0.01) {
      const overlap = minDist - distance;
      const pushX = (dx / distance) * overlap;
      const pushZ = (dz / distance) * overlap;
      return { collides: true, pushX, pushZ };
    }
  }
  return { collides: false, pushX: 0, pushZ: 0 };
}

// Input state
const keys: Record<string, boolean> = {};

// Touch movement state (module-level so it persists across renders)
const touchState = {
  active: false,
  targetX: 0,
  targetZ: 0,
};

// Detect touch device
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

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

  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const groundPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // Cache collision data (computed once)
  const treeCollisionData = useMemo(() => getTreeCollisionData(), []);
  const bushCollisionData = useMemo(() => getBushCollisionData(), []);
  const chessTableCollisionData = useMemo(() => getChessTableCollisions(), []);

  // Chess table proximity and seating
  const { setIsNearTable, setActiveTableId, isInChessView, localPlayerSide, activeTableId } = useChessStore();
  const wasNearTable = useRef(false);
  const nearTableId = useRef<string | null>(null);

  // Get seated state
  const { isSeated, sitDown, standUp } = usePlayerStore();

  // Handle sitting/standing when entering/leaving chess view
  useEffect(() => {
    if (isInChessView && localPlayerSide && activeTableId && !isSeated) {
      // Player is entering chess view - sit them down
      const seatPos = getSeatPosition(activeTableId, localPlayerSide);
      if (seatPos) {
        sitDown({
          tableId: activeTableId,
          side: localPlayerSide,
          position: { x: seatPos.x, y: seatPos.y, z: seatPos.z },
          rotation: seatPos.rotation,
        });
      }
    } else if (!isInChessView && isSeated) {
      // Player is leaving chess view - stand them up
      standUp();
    }
  }, [isInChessView, localPlayerSide, activeTableId, isSeated, sitDown, standUp]);

  // Handle key down
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore movement keys while Command is held (prevents stuck keys)
    if (e.metaKey) return;
    keys[e.code] = true;
  }, []);

  // Handle key up
  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keys[e.code] = false;

    // When Command is released, clear all movement keys
    // (browser often doesn't fire keyup for keys held during Command shortcuts)
    if (e.code === 'MetaLeft' || e.code === 'MetaRight') {
      keys['KeyW'] = false;
      keys['KeyA'] = false;
      keys['KeyS'] = false;
      keys['KeyD'] = false;
      keys['ArrowUp'] = false;
      keys['ArrowDown'] = false;
      keys['ArrowLeft'] = false;
      keys['ArrowRight'] = false;
      keys['Space'] = false;
    }
  }, []);

  // Handle window blur (clears all keys when switching apps/tabs)
  const handleBlur = useCallback(() => {
    Object.keys(keys).forEach(key => {
      keys[key] = false;
    });
  }, []);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp, handleBlur]);

  // Touch-to-move: raycast from touch point to ground plane to get world target
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersection);
    return intersection;
  }, [gl, camera, raycaster, groundPlane]);

  useEffect(() => {
    if (!isTouchDevice()) return;

    const canvas = gl.domElement;

    const handleTouchStart = (e: TouchEvent) => {
      // Don't hijack touches on UI elements (buttons, modals, etc.)
      if ((e.target as HTMLElement).closest?.('button, [role="button"], .hud, .modal, .ui-overlay')) return;
      e.preventDefault();
      const touch = e.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      if (worldPos) {
        touchState.active = true;
        touchState.targetX = worldPos.x;
        touchState.targetZ = worldPos.z;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.active) return;
      e.preventDefault();
      const touch = e.touches[0];
      const worldPos = screenToWorld(touch.clientX, touch.clientY);
      if (worldPos) {
        touchState.targetX = worldPos.x;
        touchState.targetZ = worldPos.z;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        touchState.active = false;
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [gl, screenToWorld]);

  // Update movement each frame
  useFrame((_, delta) => {
    // Don't process movement if in chess view
    if (isInChessView) return;

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

    // Touch-to-move: override movement if touch is active and no keyboard input
    let moveX: number;
    let moveZ: number;
    let isMovingNow: boolean;

    const hasKeyboardInput = moveForward !== 0 || turning !== 0;

    if (touchState.active && !hasKeyboardInput) {
      // Calculate direction from player to touch target
      const dx = touchState.targetX - position.x;
      const dz = touchState.targetZ - position.z;
      const distToTarget = Math.sqrt(dx * dx + dz * dz);

      // Stop when close enough to target (arrival threshold)
      if (distToTarget < 0.5) {
        moveX = 0;
        moveZ = 0;
        isMovingNow = false;
      } else {
        // Normalize direction
        moveX = dx / distToTarget;
        moveZ = dz / distToTarget;
        isMovingNow = true;

        // Auto-rotate character to face movement direction
        const targetRotation = Math.atan2(moveX, moveZ);
        // Smooth rotation toward target
        let rotDiff = targetRotation - currentRotation;
        // Normalize to [-PI, PI]
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        currentRotation += rotDiff * Math.min(1, TURN_SPEED * 2 * dt);
        setRotation(currentRotation);
      }
    } else {
      // Keyboard movement: calculate world-space movement based on character's facing direction
      moveX = Math.sin(currentRotation) * moveForward;
      moveZ = Math.cos(currentRotation) * moveForward;
      isMovingNow = moveForward !== 0;
    }

    // Update move direction in store
    setMoveDirection({ x: moveX, z: moveZ });

    // Calculate if moving
    setIsMoving(isMovingNow);

    // Touch always walks, keyboard can run with shift
    const isRunning = hasKeyboardInput && (keys['ShiftLeft'] || keys['ShiftRight']);
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
        // Player is stuck inside - push them out
        // Find the closest building we're inside and escape from it
        let closestBuilding = null;
        let closestDist = Infinity;

        for (const building of BUILDINGS) {
          const buildingTop = getBuildingTopHeight(building);
          if (position.y >= buildingTop - 0.1) continue;

          const dx = position.x - building.x;
          const dz = position.z - building.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          // Check if actually inside this building's collision
          if (dist < building.radius + 0.5 && dist < closestDist) {
            closestDist = dist;
            closestBuilding = building;
          }
        }

        // Push player out from the closest building
        if (closestBuilding) {
          const dx = position.x - closestBuilding.x;
          const dz = position.z - closestBuilding.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist > 0.01) {
            // Push away from building center
            const escapeSpeed = 10 * dt;
            newPosition.x = position.x + (dx / dist) * escapeSpeed;
            newPosition.z = position.z + (dz / dist) * escapeSpeed;
          } else {
            // Exactly at center - pick a random direction
            newPosition.x = position.x + 0.5;
            newPosition.z = position.z + 0.5;
          }
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

    // Vegetation collision detection (trees and bushes)
    // Pass Y position so we can walk on top of trees
    const vegCollision = checkVegetationCollision(
      newPosition.x,
      newPosition.z,
      newPosition.y,
      0.4, // Player radius for vegetation
      treeCollisionData,
      bushCollisionData
    );

    if (vegCollision.collides) {
      // Push player away from vegetation
      newPosition.x += vegCollision.pushX;
      newPosition.z += vegCollision.pushZ;
    }

    // Chess table collision detection
    const tableCollision = checkChessTableCollision(
      newPosition.x,
      newPosition.z,
      0.4, // Player radius for tables
      chessTableCollisionData
    );

    if (tableCollision.collides) {
      // Push player away from table/seat
      newPosition.x += tableCollision.pushX;
      newPosition.z += tableCollision.pushZ;
    }

    // Get terrain height at (possibly reverted) position
    const finalTerrainHeight = getTerrainHeight(newPosition.x, newPosition.z);

    // Check if standing on a building roof
    const roofHeight = getBuildingRoofHeight(newPosition.x, newPosition.z);

    // Check if standing on a tree canopy
    const treeTopHeight = getTreeTopHeight(newPosition.x, newPosition.z, treeCollisionData);

    // Ground collision - use the highest of terrain, building roof, or tree top
    // Add small offset (0.1) to account for terrain mesh interpolation differences
    const groundLevel = Math.max(finalTerrainHeight, roofHeight, treeTopHeight) + 0.1;

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
      currentAnim === 'idle' || currentAnim === 'walk' || currentAnim === 'run' || currentAnim === 'sitting'
        ? currentAnim
        : 'idle'
    );

    // Check proximity to any chess table
    let closestTable: { id: string; distance: number } | null = null;
    for (const table of CHESS_TABLES) {
      const dist = Math.sqrt(
        (newPosition.x - table.x) ** 2 +
        (newPosition.z - table.z) ** 2
      );
      if (dist < CHESS_INTERACTION_RADIUS) {
        if (!closestTable || dist < closestTable.distance) {
          closestTable = { id: table.id, distance: dist };
        }
      }
    }

    const isNearChessTable = closestTable !== null;
    const currentNearTableId = closestTable?.id ?? null;

    // Only update if changed (avoid unnecessary re-renders)
    if (isNearChessTable !== wasNearTable.current || currentNearTableId !== nearTableId.current) {
      wasNearTable.current = isNearChessTable;
      nearTableId.current = currentNearTableId;
      setIsNearTable(isNearChessTable);
      setActiveTableId(currentNearTableId);
    }
  });

  return null;
}
