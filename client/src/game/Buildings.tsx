import { useState, useEffect } from 'react';
import { getTerrainHeight, LOCATIONS } from './Terrain';

// Tree collision radius by type (based on trunk + canopy)
const TREE_COLLISION_RADIUS = 0.8;
const BUSH_COLLISION_RADIUS = 0.5;

// Tree top heights by type (in model space, before scaling)
// These are the heights where the canopy tops are
const TREE_HEIGHTS = {
  olive: 3.0,    // Olive foliage reaches ~2.5, add buffer
  cypress: 5.0,  // Tall cypress reaches ~4.5
  pine: 4.2,     // Pine canopy at ~3.7
  fig: 2.6,      // Fig is shorter and broader
};

// Canopy walkable radius multiplier (smaller than collision to stand on center)
const TREE_CANOPY_RADIUS = 0.6;

// Seeded random for consistent placement
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Simple Greek-style building component
function GreekBuilding({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);

  return (
    <group position={[x, groundY, z]} scale={scale}>
      {/* Main building - whitewashed cube */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#F5F5F5" roughness={0.9} />
      </mesh>

      {/* Blue door */}
      <mesh position={[0, 0.75, 1.51]} castShadow>
        <boxGeometry args={[0.8, 1.5, 0.1]} />
        <meshStandardMaterial color="#1E5F8A" roughness={0.7} />
      </mesh>

      {/* Windows */}
      <mesh position={[-0.8, 2, 1.51]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#1E5F8A" roughness={0.7} />
      </mesh>
      <mesh position={[0.8, 2, 1.51]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.1]} />
        <meshStandardMaterial color="#1E5F8A" roughness={0.7} />
      </mesh>

      {/* Flat roof edge */}
      <mesh position={[0, 3.1, 0]} castShadow>
        <boxGeometry args={[3.2, 0.2, 3.2]} />
        <meshStandardMaterial color="#F0F0F0" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Olive tree - gnarled trunk, silvery-green foliage with realistic branching
function OliveTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.7 + seededRandom(x * 100 + z) * 0.4;
  const lean = (seededRandom(x * 50 + z * 30) - 0.5) * 0.15;

  return (
    <group position={[x, groundY, z]} scale={scale} rotation={[lean, seededRandom(x + z) * Math.PI * 2, lean * 0.5]}>
      {/* Main gnarled trunk */}
      <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.28, 1.6, 8]} />
        <meshStandardMaterial color="#4A3D2A" roughness={0.95} />
      </mesh>
      {/* Trunk knots/texture */}
      <mesh position={[0.1, 0.5, 0.08]} castShadow>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshStandardMaterial color="#3D3225" roughness={1} />
      </mesh>
      <mesh position={[-0.08, 1.0, 0.1]} castShadow>
        <sphereGeometry args={[0.06, 6, 6]} />
        <meshStandardMaterial color="#3D3225" roughness={1} />
      </mesh>
      {/* Main branches */}
      <mesh position={[0.3, 1.5, 0.1]} rotation={[0, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.8, 6]} />
        <meshStandardMaterial color="#5D4E37" roughness={0.9} />
      </mesh>
      <mesh position={[-0.25, 1.6, -0.15]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.04, 0.07, 0.7, 6]} />
        <meshStandardMaterial color="#5D4E37" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 1.55, -0.25]} rotation={[0.4, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 0.6, 6]} />
        <meshStandardMaterial color="#5D4E37" roughness={0.9} />
      </mesh>
      {/* Silvery-green olive foliage - more clusters */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <dodecahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial color="#708238" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.6, 2.0, 0.4]} castShadow>
        <dodecahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#7D8B41" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[-0.5, 2.1, -0.3]} castShadow>
        <dodecahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial color="#6B7A35" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.3, 2.5, -0.4]} castShadow>
        <dodecahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color="#7A8C3E" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[-0.4, 2.4, 0.35]} castShadow>
        <dodecahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#6D7B38" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.5, 2.4, 0]} castShadow>
        <dodecahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#758540" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

// Cypress tree - tall, narrow, iconic Greek silhouette with layered foliage
function CypressTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.8 + seededRandom(x * 80 + z * 40) * 0.4;
  const lean = (seededRandom(x * 33 + z * 77) - 0.5) * 0.08;

  return (
    <group position={[x, groundY, z]} scale={scale} rotation={[lean, 0, lean * 0.3]}>
      {/* Trunk - visible at base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.08, 0.14, 0.8, 8]} />
        <meshStandardMaterial color="#3D3225" roughness={0.95} />
      </mesh>
      {/* Layered conical foliage for realistic cypress shape */}
      <mesh position={[0, 4.2, 0]} castShadow>
        <coneGeometry args={[0.35, 1.8, 8]} />
        <meshStandardMaterial color="#143D30" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 3.3, 0]} castShadow>
        <coneGeometry args={[0.5, 1.6, 8]} />
        <meshStandardMaterial color="#1B4D3E" roughness={0.88} flatShading />
      </mesh>
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[0.6, 1.4, 8]} />
        <meshStandardMaterial color="#1F5240" roughness={0.88} flatShading />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <coneGeometry args={[0.65, 1.2, 8]} />
        <meshStandardMaterial color="#234F3D" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <coneGeometry args={[0.55, 0.9, 8]} />
        <meshStandardMaterial color="#1B4838" roughness={0.85} flatShading />
      </mesh>
      {/* Some irregular bumps for texture */}
      <mesh position={[0.15, 2.8, 0.1]} castShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color="#1A4636" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.12, 3.5, -0.08]} castShadow>
        <dodecahedronGeometry args={[0.18, 0]} />
        <meshStandardMaterial color="#1D4A3A" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

// Pine tree - Mediterranean stone pine with umbrella canopy
function PineTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.9 + seededRandom(x * 60 + z * 90) * 0.3;
  const lean = (seededRandom(x * 22 + z * 88) - 0.5) * 0.1;

  return (
    <group position={[x, groundY, z]} scale={scale} rotation={[lean, seededRandom(x * 2 + z) * Math.PI * 2, 0]}>
      {/* Tall trunk with bark texture */}
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.1, 0.16, 3, 10]} />
        <meshStandardMaterial color="#6B4423" roughness={0.95} />
      </mesh>
      {/* Bark ridges */}
      <mesh position={[0.08, 1.2, 0.05]} castShadow>
        <boxGeometry args={[0.03, 0.6, 0.03]} />
        <meshStandardMaterial color="#5A3A1D" roughness={1} />
      </mesh>
      <mesh position={[-0.06, 0.8, -0.07]} castShadow>
        <boxGeometry args={[0.03, 0.5, 0.03]} />
        <meshStandardMaterial color="#5A3A1D" roughness={1} />
      </mesh>
      {/* Upper branches */}
      <mesh position={[0.15, 2.8, 0.1]} rotation={[0.3, 0.5, -0.4]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.5, 6]} />
        <meshStandardMaterial color="#6B4423" roughness={0.9} />
      </mesh>
      <mesh position={[-0.12, 2.9, -0.08]} rotation={[-0.2, 0.3, 0.3]} castShadow>
        <cylinderGeometry args={[0.03, 0.05, 0.4, 6]} />
        <meshStandardMaterial color="#6B4423" roughness={0.9} />
      </mesh>
      {/* Umbrella-shaped canopy - multiple layers */}
      <mesh position={[0, 3.6, 0]} castShadow>
        <dodecahedronGeometry args={[1.4, 1]} />
        <meshStandardMaterial color="#2D5A3D" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.7, 3.4, 0.5]} castShadow>
        <dodecahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color="#3A6B4A" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[-0.6, 3.5, -0.4]} castShadow>
        <dodecahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color="#2F5E40" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[0.3, 3.7, -0.6]} castShadow>
        <dodecahedronGeometry args={[0.65, 1]} />
        <meshStandardMaterial color="#356545" roughness={0.85} flatShading />
      </mesh>
      <mesh position={[-0.5, 3.45, 0.5]} castShadow>
        <dodecahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#2B5838" roughness={0.85} flatShading />
      </mesh>
    </group>
  );
}

// Fig tree - broad, spreading with distinctive shape
function FigTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.7 + seededRandom(x * 45 + z * 75) * 0.3;
  const lean = (seededRandom(x * 11 + z * 55) - 0.5) * 0.12;

  return (
    <group position={[x, groundY, z]} scale={scale} rotation={[lean, seededRandom(x * 3 + z * 2) * Math.PI * 2, 0]}>
      {/* Thick trunk with character */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.18, 0.32, 1.2, 8]} />
        <meshStandardMaterial color="#4A3828" roughness={0.95} />
      </mesh>
      {/* Trunk bulge/knot */}
      <mesh position={[0.12, 0.4, 0.1]} castShadow>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color="#3D2F22" roughness={1} />
      </mesh>
      {/* Main branches spreading out */}
      <mesh position={[0.35, 1.1, 0.2]} rotation={[0.2, 0.3, -0.5]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 0.7, 6]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      <mesh position={[-0.3, 1.15, -0.15]} rotation={[-0.15, 0.2, 0.45]} castShadow>
        <cylinderGeometry args={[0.05, 0.09, 0.65, 6]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      <mesh position={[0.1, 1.2, -0.3]} rotation={[0.4, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.6, 6]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      {/* Broad spreading canopy - many clusters */}
      <mesh position={[0, 1.9, 0]} castShadow>
        <dodecahedronGeometry args={[1.3, 1]} />
        <meshStandardMaterial color="#4A7C23" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.8, 1.7, 0.6]} castShadow>
        <dodecahedronGeometry args={[0.85, 1]} />
        <meshStandardMaterial color="#5A8C2A" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[-0.7, 1.8, -0.5]} castShadow>
        <dodecahedronGeometry args={[0.8, 1]} />
        <meshStandardMaterial color="#4D7A26" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.5, 2.1, -0.5]} castShadow>
        <dodecahedronGeometry args={[0.7, 1]} />
        <meshStandardMaterial color="#558528" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[-0.5, 2.0, 0.55]} castShadow>
        <dodecahedronGeometry args={[0.75, 1]} />
        <meshStandardMaterial color="#4B7D24" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0.3, 1.65, 0.7]} castShadow>
        <dodecahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#528225" roughness={0.8} flatShading />
      </mesh>
    </group>
  );
}

// Bush/shrub - Mediterranean maquis with realistic shape
function Bush({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.5 + seededRandom(x * 50 + z * 30) * 0.5;
  const colorVariant = seededRandom(x * 20 + z * 60);
  const rotation = seededRandom(x * 15 + z * 25) * Math.PI * 2;

  // Vary bush colors - more variety
  const baseColor = colorVariant > 0.7 ? '#4A6741' : colorVariant > 0.4 ? '#5D7A4A' : colorVariant > 0.2 ? '#3D5A35' : '#4F6B3D';
  const highlightColor = colorVariant > 0.5 ? '#5A7850' : '#4D6943';
  const shadowColor = colorVariant > 0.5 ? '#3A5232' : '#344A2D';

  return (
    <group position={[x, groundY, z]} scale={scale} rotation={[0, rotation, 0]}>
      {/* Main bush body - irregular shape */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <dodecahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial color={baseColor} roughness={0.9} flatShading />
      </mesh>
      {/* Secondary clusters */}
      <mesh position={[0.3, 0.35, 0.2]} castShadow>
        <dodecahedronGeometry args={[0.38, 1]} />
        <meshStandardMaterial color={highlightColor} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.25, 0.4, 0.15]} castShadow>
        <dodecahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial color={baseColor} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.15, 0.55, -0.25]} castShadow>
        <dodecahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial color={highlightColor} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[-0.2, 0.3, -0.2]} castShadow>
        <dodecahedronGeometry args={[0.3, 1]} />
        <meshStandardMaterial color={shadowColor} roughness={0.9} flatShading />
      </mesh>
      {/* Ground-level spread */}
      <mesh position={[0.35, 0.2, -0.1]} castShadow>
        <dodecahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial color={shadowColor} roughness={0.95} flatShading />
      </mesh>
      <mesh position={[-0.3, 0.18, 0.25]} castShadow>
        <dodecahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={shadowColor} roughness={0.95} flatShading />
      </mesh>
    </group>
  );
}

// Generic tree component that picks a random tree type
function MediterraneanTree({ position, seed }: { position: [number, number, number]; seed: number }) {
  const treeType = seededRandom(seed * 123.456);

  if (treeType < 0.3) {
    return <OliveTree position={position} />;
  } else if (treeType < 0.5) {
    return <CypressTree position={position} />;
  } else if (treeType < 0.7) {
    return <PineTree position={position} />;
  } else {
    return <FigTree position={position} />;
  }
}

// Ancient column
function Column({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);

  return (
    <group position={[x, groundY, z]}>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.3, 16]} />
        <meshStandardMaterial color="#D4C9B8" roughness={0.85} />
      </mesh>

      {/* Column shaft */}
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.35, 0.4, 3.5, 12]} />
        <meshStandardMaterial color="#E8DFD0" roughness={0.8} />
      </mesh>

      {/* Capital */}
      <mesh position={[0, 3.9, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.35, 0.3, 16]} />
        <meshStandardMaterial color="#D4C9B8" roughness={0.85} />
      </mesh>
    </group>
  );
}

// Generate tree positions (deterministic, same as rendering)
type TreeType = 'olive' | 'cypress' | 'pine' | 'fig';

function generateTreePositions(): { x: number; z: number; scale: number; type: TreeType; terrainY: number }[] {
  const positions: { x: number; z: number; scale: number; type: TreeType; terrainY: number }[] = [];
  for (let i = 0; i < 120; i++) {
    const seed = i * 137.5;
    const angle = seededRandom(seed) * Math.PI * 2;
    const radius = 8 + seededRandom(seed + 1) * 48;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const terrainY = getTerrainHeight(x, z);
    if (isNearRoad(x, z) || isNearBuilding(x, z) || terrainY < 0.5) continue;

    // Skip if near island edge (check surrounding terrain)
    const edgeCheck = 1.5;
    const minSurroundingHeight = Math.min(
      getTerrainHeight(x + edgeCheck, z),
      getTerrainHeight(x - edgeCheck, z),
      getTerrainHeight(x, z + edgeCheck),
      getTerrainHeight(x, z - edgeCheck)
    );
    if (minSurroundingHeight < 1.0) continue;

    // Calculate scale and type based on tree type
    const treeTypeRand = seededRandom(i * 123.456);
    let scale: number;
    let type: TreeType;
    if (treeTypeRand < 0.3) {
      scale = 0.7 + seededRandom(x * 100 + z) * 0.4;
      type = 'olive';
    } else if (treeTypeRand < 0.5) {
      scale = 0.8 + seededRandom(x * 80 + z * 40) * 0.4;
      type = 'cypress';
    } else if (treeTypeRand < 0.7) {
      scale = 0.9 + seededRandom(x * 60 + z * 90) * 0.3;
      type = 'pine';
    } else {
      scale = 0.7 + seededRandom(x * 45 + z * 75) * 0.3;
      type = 'fig';
    }

    positions.push({ x, z, scale, type, terrainY });
  }
  return positions;
}

// Generate bush positions (deterministic, same as rendering)
function generateBushPositions(): { x: number; z: number; scale: number }[] {
  const positions: { x: number; z: number; scale: number }[] = [];
  for (let i = 0; i < 80; i++) {
    const seed = i * 73.7 + 500;
    const angle = seededRandom(seed) * Math.PI * 2;
    const radius = 5 + seededRandom(seed + 1) * 50;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const height = getTerrainHeight(x, z);
    if (isNearRoad(x, z) || isNearBuilding(x, z) || height < 0.5) continue;

    // Skip if near island edge
    const edgeCheck = 1.0;
    const minSurroundingHeight = Math.min(
      getTerrainHeight(x + edgeCheck, z),
      getTerrainHeight(x - edgeCheck, z),
      getTerrainHeight(x, z + edgeCheck),
      getTerrainHeight(x, z - edgeCheck)
    );
    if (minSurroundingHeight < 1.0) continue;

    const scale = 0.5 + seededRandom(x * 50 + z * 30) * 0.5;
    positions.push({ x, z, scale });
  }
  return positions;
}

// Cached positions for collision detection
let cachedTreePositions: { x: number; z: number; scale: number; type: TreeType; terrainY: number }[] | null = null;
let cachedBushPositions: { x: number; z: number; scale: number }[] | null = null;

// Export tree positions for collision detection (includes height for jumping on trees)
export function getTreeCollisionData(): {
  x: number;
  z: number;
  radius: number;
  topHeight: number;
  canopyRadius: number;
}[] {
  if (!cachedTreePositions) {
    cachedTreePositions = generateTreePositions();
  }
  return cachedTreePositions.map(t => ({
    x: t.x,
    z: t.z,
    radius: TREE_COLLISION_RADIUS * t.scale,
    topHeight: t.terrainY + TREE_HEIGHTS[t.type] * t.scale,
    canopyRadius: TREE_CANOPY_RADIUS * t.scale * (t.type === 'cypress' ? 0.6 : 1.2), // Cypress narrower
  }));
}

// Export bush positions for collision detection
export function getBushCollisionData(): { x: number; z: number; radius: number }[] {
  if (!cachedBushPositions) {
    cachedBushPositions = generateBushPositions();
  }
  return cachedBushPositions.map(b => ({
    x: b.x,
    z: b.z,
    radius: BUSH_COLLISION_RADIUS * b.scale,
  }));
}

// Building positions (defined here so tree placement can check against them)
const BUILDING_POSITIONS: { x: number; z: number; scale: number }[] = [
  // Agora area (town center)
  { x: 8, z: 6, scale: 1.2 },
  { x: -7, z: 8, scale: 0.9 },
  { x: 10, z: -5, scale: 1 },
  { x: -9, z: -6, scale: 0.85 },
  // Harbor area
  { x: LOCATIONS.HARBOR.x + 8, z: LOCATIONS.HARBOR.z - 3, scale: 1.1 },
  { x: LOCATIONS.HARBOR.x - 5, z: LOCATIONS.HARBOR.z + 6, scale: 0.9 },
  { x: LOCATIONS.HARBOR.x + 4, z: LOCATIONS.HARBOR.z + 8, scale: 0.85 },
  // Amphitheater area
  { x: LOCATIONS.AMPHITHEATER.x + 7, z: LOCATIONS.AMPHITHEATER.z + 5, scale: 1 },
  { x: LOCATIONS.AMPHITHEATER.x - 6, z: LOCATIONS.AMPHITHEATER.z + 8, scale: 0.9 },
  // Market area
  { x: LOCATIONS.MARKET.x + 6, z: LOCATIONS.MARKET.z - 5, scale: 0.95 },
  { x: LOCATIONS.MARKET.x - 5, z: LOCATIONS.MARKET.z + 7, scale: 1 },
  { x: LOCATIONS.MARKET.x + 8, z: LOCATIONS.MARKET.z + 4, scale: 0.85 },
  // Lighthouse area
  { x: LOCATIONS.LIGHTHOUSE.x - 6, z: LOCATIONS.LIGHTHOUSE.z + 4, scale: 0.9 },
];

// Check if position is too close to a building
function isNearBuilding(x: number, z: number): boolean {
  for (const building of BUILDING_POSITIONS) {
    const dist = Math.sqrt((x - building.x) ** 2 + (z - building.z) ** 2);
    // Building is 3x3 units scaled, plus buffer for tree canopy
    const minDist = 3 * building.scale + 2;
    if (dist < minDist) return true;
  }
  return false;
}

// Check if position is too close to roads (for tree placement)
function isNearRoad(x: number, z: number): boolean {
  // Check distance to key locations
  for (const loc of Object.values(LOCATIONS)) {
    const dist = Math.sqrt((x - loc.x) ** 2 + (z - loc.z) ** 2);
    if (dist < 8) return true;
  }

  // Check distance to road segments (simplified check)
  const roadEndpoints = [
    [LOCATIONS.AGORA, LOCATIONS.HARBOR],
    [LOCATIONS.AGORA, LOCATIONS.TEMPLE],
    [LOCATIONS.AGORA, LOCATIONS.AMPHITHEATER],
    [LOCATIONS.AGORA, LOCATIONS.MARKET],
    [LOCATIONS.HARBOR, LOCATIONS.MARKET],
    [LOCATIONS.TEMPLE, LOCATIONS.LIGHTHOUSE],
    [LOCATIONS.AMPHITHEATER, LOCATIONS.LIGHTHOUSE],
    [LOCATIONS.AMPHITHEATER, LOCATIONS.TEMPLE],
  ];

  for (const [from, to] of roadEndpoints) {
    // Distance to line segment
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const lengthSq = dx * dx + dz * dz;
    let t = ((x - from.x) * dx + (z - from.z) * dz) / lengthSq;
    t = Math.max(0, Math.min(1, t));
    const projX = from.x + t * dx;
    const projZ = from.z + t * dz;
    const dist = Math.sqrt((x - projX) ** 2 + (z - projZ) ** 2);
    if (dist < 6) return true;
  }

  return false;
}

// Pre-compute building positions at module level
const BUILDING_DATA = BUILDING_POSITIONS.map(b => ({
  pos: [b.x, 0, b.z] as [number, number, number],
  scale: b.scale,
}));

// Pre-compute column positions at module level
const COLUMN_POSITIONS: [number, number, number][] = (() => {
  const positions: [number, number, number][] = [];
  const tx = LOCATIONS.TEMPLE.x;
  const tz = LOCATIONS.TEMPLE.z;
  for (let i = 0; i < 5; i++) {
    positions.push([tx - 6 + i * 3, 0, tz - 4]);
    positions.push([tx - 6 + i * 3, 0, tz + 4]);
  }
  return positions;
})();

export function Buildings() {
  // Use deferred computation - compute tree/bush positions after initial render
  const [trees, setTrees] = useState<[number, number, number][]>([]);
  const [bushes, setBushes] = useState<[number, number, number][]>([]);

  useEffect(() => {
    // Defer heavy position generation to allow UI to render first
    const frameId = requestAnimationFrame(() => {
      // Generate tree positions if not cached
      if (!cachedTreePositions) {
        cachedTreePositions = generateTreePositions();
      }
      setTrees(cachedTreePositions.map(t => [t.x, 0, t.z] as [number, number, number]));

      // Generate bush positions if not cached
      if (!cachedBushPositions) {
        cachedBushPositions = generateBushPositions();
      }
      setBushes(cachedBushPositions.map(b => [b.x, 0, b.z] as [number, number, number]));
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <group>
      {/* Buildings */}
      {BUILDING_DATA.map((b, i) => (
        <GreekBuilding
          key={`building-${i}`}
          position={b.pos}
          scale={b.scale}
        />
      ))}

      {/* Mediterranean Trees - varied types */}
      {trees.map((pos, i) => (
        <MediterraneanTree key={`tree-${i}`} position={pos} seed={i} />
      ))}

      {/* Temple Columns */}
      {COLUMN_POSITIONS.map((pos, i) => (
        <Column key={`column-${i}`} position={pos} />
      ))}

      {/* Bushes */}
      {bushes.map((pos, i) => (
        <Bush key={`bush-${i}`} position={pos} />
      ))}

      {/* Ground markers for key locations */}
      {/* Agora marker - stone plaza */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 32]} />
        <meshStandardMaterial color="#C4A574" roughness={0.9} />
      </mesh>
    </group>
  );
}
