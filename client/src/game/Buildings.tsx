import { useMemo } from 'react';
import * as THREE from 'three';
import { getTerrainHeight, LOCATIONS } from './Terrain';

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

// Olive tree - gnarled trunk, silvery-green foliage
function OliveTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.7 + seededRandom(x * 100 + z) * 0.4;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      {/* Gnarled trunk */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.25, 1.6, 6]} />
        <meshStandardMaterial color="#5D4E37" roughness={0.95} />
      </mesh>
      {/* Silvery-green olive foliage */}
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

// Cypress tree - tall, narrow, iconic Greek silhouette
function CypressTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.8 + seededRandom(x * 80 + z * 40) * 0.4;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.15, 1, 6]} />
        <meshStandardMaterial color="#4A3D2A" roughness={0.9} />
      </mesh>
      {/* Tall conical foliage */}
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

// Pine tree - Mediterranean stone pine with umbrella canopy
function PineTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.9 + seededRandom(x * 60 + z * 90) * 0.3;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      {/* Tall trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 3, 8]} />
        <meshStandardMaterial color="#8B6914" roughness={0.9} />
      </mesh>
      {/* Umbrella-shaped canopy */}
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

// Fig tree - broad, spreading
function FigTree({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.7 + seededRandom(x * 45 + z * 75) * 0.3;

  return (
    <group position={[x, groundY, z]} scale={scale}>
      {/* Short thick trunk */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.3, 1.2, 6]} />
        <meshStandardMaterial color="#5C4033" roughness={0.9} />
      </mesh>
      {/* Broad spreading canopy */}
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

// Bush/shrub - Mediterranean maquis
function Bush({ position }: { position: [number, number, number] }) {
  const [x, , z] = position;
  const groundY = getTerrainHeight(x, z);
  const scale = 0.5 + seededRandom(x * 50 + z * 30) * 0.5;
  const colorVariant = seededRandom(x * 20 + z * 60);

  // Vary bush colors
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

export function Buildings() {
  // Generate building positions around key locations
  const buildings = useMemo(() => {
    return [
      // Agora area (town center)
      { pos: [8, 0, 6] as [number, number, number], scale: 1.2 },
      { pos: [-7, 0, 8] as [number, number, number], scale: 0.9 },
      { pos: [10, 0, -5] as [number, number, number], scale: 1 },
      { pos: [-9, 0, -6] as [number, number, number], scale: 0.85 },

      // Harbor area
      { pos: [LOCATIONS.HARBOR.x + 8, 0, LOCATIONS.HARBOR.z - 3] as [number, number, number], scale: 1.1 },
      { pos: [LOCATIONS.HARBOR.x - 5, 0, LOCATIONS.HARBOR.z + 6] as [number, number, number], scale: 0.9 },
      { pos: [LOCATIONS.HARBOR.x + 4, 0, LOCATIONS.HARBOR.z + 8] as [number, number, number], scale: 0.85 },

      // Amphitheater area
      { pos: [LOCATIONS.AMPHITHEATER.x + 7, 0, LOCATIONS.AMPHITHEATER.z + 5] as [number, number, number], scale: 1 },
      { pos: [LOCATIONS.AMPHITHEATER.x - 6, 0, LOCATIONS.AMPHITHEATER.z + 8] as [number, number, number], scale: 0.9 },

      // Market area
      { pos: [LOCATIONS.MARKET.x + 6, 0, LOCATIONS.MARKET.z - 5] as [number, number, number], scale: 0.95 },
      { pos: [LOCATIONS.MARKET.x - 5, 0, LOCATIONS.MARKET.z + 7] as [number, number, number], scale: 1 },
      { pos: [LOCATIONS.MARKET.x + 8, 0, LOCATIONS.MARKET.z + 4] as [number, number, number], scale: 0.85 },

      // Lighthouse area
      { pos: [LOCATIONS.LIGHTHOUSE.x - 6, 0, LOCATIONS.LIGHTHOUSE.z + 4] as [number, number, number], scale: 0.9 },
    ];
  }, []);

  // Olive trees scattered around (deterministic, avoiding roads) - many more trees!
  const trees = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 120; i++) {
      const seed = i * 137.5; // Golden angle-ish for good distribution
      const angle = seededRandom(seed) * Math.PI * 2;
      const radius = 8 + seededRandom(seed + 1) * 48;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Skip if too close to road or building, or if underwater
      const height = getTerrainHeight(x, z);
      if (isNearRoad(x, z) || height < 0.5) continue;

      positions.push([x, 0, z]);
    }
    return positions;
  }, []);

  // Temple columns at the Temple location
  const columns = useMemo(() => {
    const positions: [number, number, number][] = [];
    const tx = LOCATIONS.TEMPLE.x;
    const tz = LOCATIONS.TEMPLE.z;

    // Create a temple structure (two rows of columns)
    for (let i = 0; i < 5; i++) {
      positions.push([tx - 6 + i * 3, 0, tz - 4]);
      positions.push([tx - 6 + i * 3, 0, tz + 4]);
    }
    return positions;
  }, []);

  // Bushes scattered for extra greenery
  const bushes = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 80; i++) {
      const seed = i * 73.7 + 500;
      const angle = seededRandom(seed) * Math.PI * 2;
      const radius = 5 + seededRandom(seed + 1) * 50;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Skip if too close to road or if underwater
      const height = getTerrainHeight(x, z);
      if (isNearRoad(x, z) || height < 0.5) continue;

      positions.push([x, 0, z]);
    }
    return positions;
  }, []);

  return (
    <group>
      {/* Buildings */}
      {buildings.map((b, i) => (
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
      {columns.map((pos, i) => (
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
