import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
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

// Tree types
type TreeType = 'olive' | 'cypress' | 'pine' | 'fig';

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

// Check if position is too close to a building
function isNearBuilding(x: number, z: number): boolean {
  const BUILDING_POSITIONS = [
    { x: 8, z: 6, scale: 1.2 },
    { x: -7, z: 8, scale: 0.9 },
    { x: 10, z: -5, scale: 1 },
    { x: -9, z: -6, scale: 0.85 },
    { x: LOCATIONS.HARBOR.x + 8, z: LOCATIONS.HARBOR.z - 3, scale: 1.1 },
    { x: LOCATIONS.HARBOR.x - 5, z: LOCATIONS.HARBOR.z + 6, scale: 0.9 },
    { x: LOCATIONS.HARBOR.x + 4, z: LOCATIONS.HARBOR.z + 8, scale: 0.85 },
    { x: LOCATIONS.AMPHITHEATER.x + 7, z: LOCATIONS.AMPHITHEATER.z + 5, scale: 1 },
    { x: LOCATIONS.AMPHITHEATER.x - 6, z: LOCATIONS.AMPHITHEATER.z + 8, scale: 0.9 },
    { x: LOCATIONS.MARKET.x + 6, z: LOCATIONS.MARKET.z - 5, scale: 0.95 },
    { x: LOCATIONS.MARKET.x - 5, z: LOCATIONS.MARKET.z + 7, scale: 1 },
    { x: LOCATIONS.MARKET.x + 8, z: LOCATIONS.MARKET.z + 4, scale: 0.85 },
    { x: LOCATIONS.LIGHTHOUSE.x - 6, z: LOCATIONS.LIGHTHOUSE.z + 4, scale: 0.9 },
  ];

  for (const building of BUILDING_POSITIONS) {
    const dist = Math.sqrt((x - building.x) ** 2 + (z - building.z) ** 2);
    const minDist = 3 * building.scale + 2;
    if (dist < minDist) return true;
  }
  return false;
}

// Tree instance data
interface TreeInstance {
  x: number;
  z: number;
  terrainY: number;
  scale: number;
  rotation: number;
  lean: number;
  type: TreeType;
}

// Bush instance data
interface BushInstance {
  x: number;
  z: number;
  terrainY: number;
  scale: number;
  colorVariant: number;
  flowerVariant: number;
}

// Generate tree positions
function generateTreePositions(): TreeInstance[] {
  const positions: TreeInstance[] = [];
  for (let i = 0; i < 120; i++) {
    const seed = i * 137.5;
    const angle = seededRandom(seed) * Math.PI * 2;
    const radius = 8 + seededRandom(seed + 1) * 48;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const terrainY = getTerrainHeight(x, z);
    if (isNearRoad(x, z) || isNearBuilding(x, z) || terrainY < 0.5) continue;

    const edgeCheck = 1.5;
    const minSurroundingHeight = Math.min(
      getTerrainHeight(x + edgeCheck, z),
      getTerrainHeight(x - edgeCheck, z),
      getTerrainHeight(x, z + edgeCheck),
      getTerrainHeight(x, z - edgeCheck)
    );
    if (minSurroundingHeight < 1.0) continue;

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

    const rotation = seededRandom(x + z) * Math.PI * 2;
    const lean = (seededRandom(x * 50 + z * 30) - 0.5) * 0.15;

    positions.push({ x, z, terrainY, scale, rotation, lean, type });
  }
  return positions;
}

// Generate bush positions
function generateBushPositions(): BushInstance[] {
  const positions: BushInstance[] = [];
  for (let i = 0; i < 80; i++) {
    const seed = i * 73.7 + 500;
    const angle = seededRandom(seed) * Math.PI * 2;
    const radius = 5 + seededRandom(seed + 1) * 50;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const terrainY = getTerrainHeight(x, z);
    if (isNearRoad(x, z) || isNearBuilding(x, z) || terrainY < 0.5) continue;

    const edgeCheck = 1.0;
    const minSurroundingHeight = Math.min(
      getTerrainHeight(x + edgeCheck, z),
      getTerrainHeight(x - edgeCheck, z),
      getTerrainHeight(x, z + edgeCheck),
      getTerrainHeight(x, z - edgeCheck)
    );
    if (minSurroundingHeight < 1.0) continue;

    const scale = 0.5 + seededRandom(x * 50 + z * 30) * 0.5;
    const colorVariant = seededRandom(x * 20 + z * 60);
    const flowerVariant = seededRandom(x * 35 + z * 45);

    positions.push({ x, z, terrainY, scale, colorVariant, flowerVariant });
  }
  return positions;
}

// Cached positions
let cachedTreePositions: TreeInstance[] | null = null;
let cachedBushPositions: BushInstance[] | null = null;

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

// Instanced tree component - renders all trees of one type efficiently
function InstancedTrees({ trees, type }: { trees: TreeInstance[]; type: TreeType }) {
  const filteredTrees = useMemo(() => trees.filter(t => t.type === type), [trees, type]);
  const count = filteredTrees.length;

  // Refs for instanced meshes
  const trunkRef = useRef<THREE.InstancedMesh>(null);
  const foliageRef = useRef<THREE.InstancedMesh>(null);
  const foliage2Ref = useRef<THREE.InstancedMesh>(null);

  // Set up instance matrices
  useEffect(() => {
    if (!trunkRef.current || !foliageRef.current || !foliage2Ref.current) return;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();
    const tempEuler = new THREE.Euler();

    filteredTrees.forEach((tree, i) => {
      const { x, z, terrainY, scale, rotation, lean } = tree;

      // Trunk matrix
      tempPosition.set(x, terrainY + getTrunkHeight(type) * scale, z);
      tempEuler.set(lean, rotation, lean * 0.5);
      tempQuaternion.setFromEuler(tempEuler);
      tempScale.set(scale, scale, scale);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      trunkRef.current!.setMatrixAt(i, tempMatrix);

      // Main foliage matrix
      tempPosition.set(x, terrainY + getFoliageHeight(type) * scale, z);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      foliageRef.current!.setMatrixAt(i, tempMatrix);

      // Secondary foliage matrix (offset)
      const offset = getFoliageOffset(type);
      tempPosition.set(x + offset.x * scale, terrainY + (getFoliageHeight(type) + offset.y) * scale, z + offset.z * scale);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      foliage2Ref.current!.setMatrixAt(i, tempMatrix);
    });

    trunkRef.current.instanceMatrix.needsUpdate = true;
    foliageRef.current.instanceMatrix.needsUpdate = true;
    foliage2Ref.current.instanceMatrix.needsUpdate = true;
  }, [filteredTrees, type]);

  if (count === 0) return null;

  const { trunkGeo, trunkColor, foliageGeo, foliageColor, foliage2Color } = getTreeGeometryConfig(type);

  return (
    <group>
      {/* Trunk */}
      <instancedMesh ref={trunkRef} args={[undefined, undefined, count]} castShadow receiveShadow>
        <cylinderGeometry args={trunkGeo} />
        <meshStandardMaterial color={trunkColor} roughness={0.95} />
      </instancedMesh>

      {/* Main foliage */}
      <instancedMesh ref={foliageRef} args={[undefined, undefined, count]} castShadow>
        <dodecahedronGeometry args={foliageGeo} />
        <meshStandardMaterial color={foliageColor} roughness={0.85} flatShading />
      </instancedMesh>

      {/* Secondary foliage */}
      <instancedMesh ref={foliage2Ref} args={[undefined, undefined, count]} castShadow>
        <dodecahedronGeometry args={[foliageGeo[0] * 0.7, foliageGeo[1]]} />
        <meshStandardMaterial color={foliage2Color} roughness={0.85} flatShading />
      </instancedMesh>
    </group>
  );
}

// Helper functions for tree geometry configuration
function getTrunkHeight(type: TreeType): number {
  switch (type) {
    case 'olive': return 0.8;
    case 'cypress': return 0.4;
    case 'pine': return 1.5;
    case 'fig': return 0.6;
  }
}

function getFoliageHeight(type: TreeType): number {
  switch (type) {
    case 'olive': return 2.3;
    case 'cypress': return 2.5;
    case 'pine': return 3.5;
    case 'fig': return 1.9;
  }
}

function getFoliageOffset(type: TreeType): { x: number; y: number; z: number } {
  switch (type) {
    case 'olive': return { x: 0.5, y: -0.3, z: 0.3 };
    case 'cypress': return { x: 0, y: 0.8, z: 0 };
    case 'pine': return { x: 0.5, y: -0.2, z: 0.3 };
    case 'fig': return { x: 0.6, y: -0.2, z: 0.4 };
  }
}

function getTreeGeometryConfig(type: TreeType): {
  trunkGeo: [number, number, number, number];
  trunkColor: string;
  foliageGeo: [number, number];
  foliageColor: string;
  foliage2Color: string;
} {
  switch (type) {
    case 'olive':
      return {
        trunkGeo: [0.12, 0.25, 1.6, 8],
        trunkColor: '#4A3D2A',
        foliageGeo: [1.1, 1],
        foliageColor: '#708238',
        foliage2Color: '#7D8B41',
      };
    case 'cypress':
      return {
        trunkGeo: [0.08, 0.14, 0.8, 8],
        trunkColor: '#3D3225',
        foliageGeo: [0.6, 1],
        foliageColor: '#1B4D3E',
        foliage2Color: '#143D30',
      };
    case 'pine':
      return {
        trunkGeo: [0.1, 0.16, 3, 8],
        trunkColor: '#6B4423',
        foliageGeo: [1.5, 1],
        foliageColor: '#2D5A3D',
        foliage2Color: '#3A6B4A',
      };
    case 'fig':
      return {
        trunkGeo: [0.15, 0.25, 1.2, 8],
        trunkColor: '#5C4033',
        foliageGeo: [1.2, 1],
        foliageColor: '#4A7C23',
        foliage2Color: '#5A8C2A',
      };
  }
}

// Instanced bushes component
function InstancedBushes({ bushes }: { bushes: BushInstance[] }) {
  const count = bushes.length;

  const mainRef = useRef<THREE.InstancedMesh>(null);
  const secondary1Ref = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);

  // Colors for instances
  const colorArray = useMemo(() => {
    const colors = new Float32Array(count * 3);
    bushes.forEach((bush, i) => {
      const { colorVariant } = bush;
      let r, g, b;
      if (colorVariant > 0.6) {
        r = 0.29; g = 0.40; b = 0.25; // #4A6741
      } else if (colorVariant > 0.3) {
        r = 0.36; g = 0.48; b = 0.29; // #5D7A4A
      } else {
        r = 0.24; g = 0.35; b = 0.21; // #3D5A35
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    });
    return colors;
  }, [bushes, count]);

  const flowerColorArray = useMemo(() => {
    const colors = new Float32Array(count * 3);
    bushes.forEach((bush, i) => {
      const { flowerVariant } = bush;
      let r, g, b;
      if (flowerVariant > 0.7) {
        r = 0.91; g = 0.64; b = 0.79; // Pink
      } else if (flowerVariant > 0.4) {
        r = 0.96; g = 0.88; b = 0.30; // Yellow
      } else if (flowerVariant > 0.2) {
        r = 0.79; g = 0.63; b = 0.86; // Lavender
      } else {
        r = 1; g = 1; b = 1; // White
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    });
    return colors;
  }, [bushes, count]);

  useEffect(() => {
    if (!mainRef.current || !secondary1Ref.current || !flowerRef.current) return;

    const tempMatrix = new THREE.Matrix4();
    const tempPosition = new THREE.Vector3();
    const tempQuaternion = new THREE.Quaternion();
    const tempScale = new THREE.Vector3();

    // Set instance colors with proper needsUpdate flag
    const mainColorAttr = new THREE.InstancedBufferAttribute(colorArray, 3);
    mainColorAttr.needsUpdate = true;
    mainRef.current.instanceColor = mainColorAttr;

    const secondaryColorAttr = new THREE.InstancedBufferAttribute(new Float32Array(colorArray), 3);
    secondaryColorAttr.needsUpdate = true;
    secondary1Ref.current.instanceColor = secondaryColorAttr;

    const flowerColorAttr = new THREE.InstancedBufferAttribute(flowerColorArray, 3);
    flowerColorAttr.needsUpdate = true;
    flowerRef.current.instanceColor = flowerColorAttr;

    bushes.forEach((bush, i) => {
      const { x, z, terrainY, scale } = bush;

      // Main bush body
      tempPosition.set(x, terrainY + 0.4 * scale, z);
      tempQuaternion.identity();
      tempScale.set(scale, scale, scale);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      mainRef.current!.setMatrixAt(i, tempMatrix);

      // Secondary bush lump
      tempPosition.set(x + 0.25 * scale, terrainY + 0.35 * scale, z + 0.15 * scale);
      tempScale.set(scale * 0.7, scale * 0.7, scale * 0.7);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      secondary1Ref.current!.setMatrixAt(i, tempMatrix);

      // Flowers on top
      tempPosition.set(x + 0.1 * scale, terrainY + 0.7 * scale, z + 0.05 * scale);
      tempScale.set(scale * 0.15, scale * 0.15, scale * 0.15);
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      flowerRef.current!.setMatrixAt(i, tempMatrix);
    });

    mainRef.current.instanceMatrix.needsUpdate = true;
    secondary1Ref.current.instanceMatrix.needsUpdate = true;
    flowerRef.current.instanceMatrix.needsUpdate = true;
  }, [bushes, colorArray, flowerColorArray]);

  if (count === 0) return null;

  return (
    <group>
      {/* Main bush body */}
      <instancedMesh ref={mainRef} args={[undefined, undefined, count]} castShadow>
        <dodecahedronGeometry args={[0.6, 1]} />
        <meshStandardMaterial color="#4A6741" roughness={0.85} flatShading />
      </instancedMesh>

      {/* Secondary lump */}
      <instancedMesh ref={secondary1Ref} args={[undefined, undefined, count]} castShadow>
        <dodecahedronGeometry args={[0.5, 1]} />
        <meshStandardMaterial color="#5D7A4A" roughness={0.85} flatShading />
      </instancedMesh>

      {/* Flowers */}
      <instancedMesh ref={flowerRef} args={[undefined, undefined, count]} castShadow>
        <sphereGeometry args={[0.5, 6, 6]} />
        <meshStandardMaterial color="#E8A3CA" roughness={0.6} />
      </instancedMesh>
    </group>
  );
}

// Main Vegetation component using instancing
export function Vegetation() {
  const trees = useMemo(() => {
    if (!cachedTreePositions) {
      cachedTreePositions = generateTreePositions();
    }
    return cachedTreePositions;
  }, []);

  const bushes = useMemo(() => {
    if (!cachedBushPositions) {
      cachedBushPositions = generateBushPositions();
    }
    return cachedBushPositions;
  }, []);

  return (
    <group>
      {/* Instanced trees by type */}
      <InstancedTrees trees={trees} type="olive" />
      <InstancedTrees trees={trees} type="cypress" />
      <InstancedTrees trees={trees} type="pine" />
      <InstancedTrees trees={trees} type="fig" />

      {/* Instanced bushes */}
      <InstancedBushes bushes={bushes} />
    </group>
  );
}
