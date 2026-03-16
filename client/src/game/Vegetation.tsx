import { useState, useEffect } from 'react';
import { getTerrainHeight, LOCATIONS } from './Terrain';

// Tree collision radius by type (based on trunk + canopy)
const TREE_COLLISION_RADIUS = 0.8;
const BUSH_COLLISION_RADIUS = 0.5;

// Tree top heights by type (in model space, before scaling)
const TREE_HEIGHTS = {
  olive: 3.0,
  cypress: 5.0,
  pine: 4.2,
  fig: 2.6,
};

// Canopy walkable radius multiplier
const TREE_CANOPY_RADIUS = 0.6;

// Seeded random for consistent placement
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Olive tree - simple version (4 meshes)
function OliveTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.7 + seededRandom(x * 100 + z) * 0.4;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 1.6, 6]} />
        <meshStandardMaterial color="#5D4E37" roughness={0.95} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <sphereGeometry args={[1.3, 8, 6]} />
        <meshStandardMaterial color="#708238" roughness={0.8} />
      </mesh>
      <mesh position={[0.5, 2.0, 0.3]} castShadow>
        <sphereGeometry args={[0.8, 6, 6]} />
        <meshStandardMaterial color="#7D8B41" roughness={0.8} />
      </mesh>
      <mesh position={[-0.4, 2.3, -0.2]} castShadow>
        <sphereGeometry args={[0.7, 6, 6]} />
        <meshStandardMaterial color="#6B7A35" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Cypress tree - simple version (3 meshes)
function CypressTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.8 + seededRandom(x * 80 + z * 40) * 0.4;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1, 6]} />
        <meshStandardMaterial color="#4A3D2A" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <coneGeometry args={[0.8, 5, 8]} />
        <meshStandardMaterial color="#1B4D3E" roughness={0.85} />
      </mesh>
      <mesh position={[0, 2.0, 0]} castShadow>
        <coneGeometry args={[0.6, 2, 8]} />
        <meshStandardMaterial color="#234F3D" roughness={0.85} />
      </mesh>
    </group>
  );
}

// Pine tree - simple version (3 meshes)
function PineTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.9 + seededRandom(x * 60 + z * 90) * 0.3;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 3, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      <mesh position={[0, 3.5, 0]} castShadow>
        <sphereGeometry args={[1.8, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#2D5A3D" roughness={0.8} />
      </mesh>
      <mesh position={[0.5, 3.3, 0.3]} castShadow>
        <sphereGeometry args={[0.9, 6, 4]} />
        <meshStandardMaterial color="#3A6B4A" roughness={0.8} />
      </mesh>
    </group>
  );
}

// Fig tree - simple version (4 meshes)
function FigTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.7 + seededRandom(x * 45 + z * 75) * 0.3;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.2, 6]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[1.6, 8, 6]} />
        <meshStandardMaterial color="#4A7C23" roughness={0.75} />
      </mesh>
      <mesh position={[0.7, 1.6, 0.5]} castShadow>
        <sphereGeometry args={[1.0, 6, 6]} />
        <meshStandardMaterial color="#5A8C2A" roughness={0.75} />
      </mesh>
      <mesh position={[-0.6, 1.7, -0.4]} castShadow>
        <sphereGeometry args={[0.9, 6, 6]} />
        <meshStandardMaterial color="#4D7A26" roughness={0.75} />
      </mesh>
    </group>
  );
}

// Bush/shrub - simple version (2 meshes)
function Bush({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.5 + seededRandom(x * 50 + z * 30) * 0.5;
  const colorVariant = seededRandom(x * 20 + z * 60);
  const color = colorVariant > 0.6 ? '#4A6741' : colorVariant > 0.3 ? '#5D7A4A' : '#3D5A35';

  return (
    <group position={[x, groundY, z]} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow>
        <sphereGeometry args={[0.6, 6, 6]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0.25, 0.35, 0.15]} castShadow>
        <sphereGeometry args={[0.4, 6, 6]} />
        <meshStandardMaterial color={color} roughness={0.85} />
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

// Check if position is too close to roads
function isNearRoad(x: number, z: number): boolean {
  for (const loc of Object.values(LOCATIONS)) {
    const dist = Math.sqrt((x - loc.x) ** 2 + (z - loc.z) ** 2);
    if (dist < 8) return true;
  }

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

// Tree types
type TreeType = 'olive' | 'cypress' | 'pine' | 'fig';

// Generate tree positions
function generateTreePositions(): { x: number; z: number; scale: number; type: TreeType; terrainY: number }[] {
  const positions: { x: number; z: number; scale: number; type: TreeType; terrainY: number }[] = [];
  for (let i = 0; i < 80; i++) {
    const seed = i * 137.5;
    const angle = seededRandom(seed) * Math.PI * 2;
    const radius = 8 + seededRandom(seed + 1) * 48;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const terrainY = getTerrainHeight(x, z);
    if (isNearRoad(x, z) || terrainY < 0.8) continue;

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

// Generate bush positions
function generateBushPositions(): { x: number; z: number; scale: number }[] {
  const positions: { x: number; z: number; scale: number }[] = [];
  for (let i = 0; i < 50; i++) {
    const seed = i * 73.7 + 500;
    const angle = seededRandom(seed) * Math.PI * 2;
    const radius = 5 + seededRandom(seed + 1) * 50;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const terrainY = getTerrainHeight(x, z);
    if (isNearRoad(x, z) || terrainY < 0.8) continue;

    const scale = 0.5 + seededRandom(x * 50 + z * 30) * 0.5;
    positions.push({ x, z, scale });
  }
  return positions;
}

// Cached positions for collision detection
let cachedTreePositions: { x: number; z: number; scale: number; type: TreeType; terrainY: number }[] | null = null;
let cachedBushPositions: { x: number; z: number; scale: number }[] | null = null;

// Export tree positions for collision detection
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
    canopyRadius: TREE_CANOPY_RADIUS * t.scale * (t.type === 'cypress' ? 0.6 : 1.2),
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

// Main Vegetation component
export function Vegetation() {
  const [trees, setTrees] = useState<[number, number, number][]>([]);
  const [bushes, setBushes] = useState<[number, number, number][]>([]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (!cachedTreePositions) {
        cachedTreePositions = generateTreePositions();
      }
      setTrees(cachedTreePositions.map(t => [t.x, 0, t.z] as [number, number, number]));

      if (!cachedBushPositions) {
        cachedBushPositions = generateBushPositions();
      }
      setBushes(cachedBushPositions.map(b => [b.x, 0, b.z] as [number, number, number]));
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <group>
      {trees.map((pos, i) => (
        <MediterraneanTree key={`tree-${i}`} position={pos} seed={i} />
      ))}
      {bushes.map((pos, i) => (
        <Bush key={`bush-${i}`} position={pos} />
      ))}
    </group>
  );
}
