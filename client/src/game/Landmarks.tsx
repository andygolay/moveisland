import { getTerrainHeight, LOCATIONS } from './Terrain';

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

// Pre-compute column positions at temple
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

// Main Landmarks component - columns and plaza
export function Landmarks() {
  return (
    <group>
      {/* Temple Columns */}
      {COLUMN_POSITIONS.map((pos, i) => (
        <Column key={`column-${i}`} position={pos} />
      ))}

      {/* Agora marker - stone plaza */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[6, 32]} />
        <meshStandardMaterial color="#C4A574" roughness={0.9} />
      </mesh>
    </group>
  );
}
