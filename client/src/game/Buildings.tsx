import { getTerrainHeight, LOCATIONS } from './Terrain';

// Re-export collision data from Vegetation for backwards compatibility
export { getTreeCollisionData, getBushCollisionData } from './Vegetation';

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

// Building positions
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

// Pre-compute building data
const BUILDING_DATA = BUILDING_POSITIONS.map(b => ({
  pos: [b.x, 0, b.z] as [number, number, number],
  scale: b.scale,
}));

// Main Buildings component
export function Buildings() {
  return (
    <group>
      {BUILDING_DATA.map((b, i) => (
        <GreekBuilding
          key={`building-${i}`}
          position={b.pos}
          scale={b.scale}
        />
      ))}
    </group>
  );
}
