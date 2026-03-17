import { useState, useEffect } from 'react';
import * as THREE from 'three';

// Seeded random for consistent terrain
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Deterministic noise function
function noise2D(x: number, z: number): number {
  const seed1 = x * 12.9898 + z * 78.233;
  const seed2 = x * 39.346 + z * 11.135;
  const seed3 = x * 73.156 + z * 93.456;

  return (
    seededRandom(seed1) * 0.5 +
    seededRandom(seed2) * 0.3 +
    seededRandom(seed3) * 0.2
  ) - 0.5;
}

// Road width - wider, more prominent roads
const ROAD_WIDTH = 5.0;
const ROAD_EDGE = 2.0; // Soft edge for blending

// Key locations on the island
const LOCATIONS = {
  AGORA: { x: 0, z: 0 },         // Center spawn/social hub
  HARBOR: { x: -35, z: 30 },     // Fishing harbor
  TEMPLE: { x: 30, z: -25 },     // Temple ruins
  AMPHITHEATER: { x: 25, z: 25 }, // Events area
  MARKET: { x: -25, z: -20 },    // Market square
  LIGHTHOUSE: { x: 40, z: 10 },  // Lighthouse point
};

// Road segments connecting locations
const ROAD_SEGMENTS = [
  // Main roads from Agora (center)
  { from: LOCATIONS.AGORA, to: LOCATIONS.HARBOR },
  { from: LOCATIONS.AGORA, to: LOCATIONS.TEMPLE },
  { from: LOCATIONS.AGORA, to: LOCATIONS.AMPHITHEATER },
  { from: LOCATIONS.AGORA, to: LOCATIONS.MARKET },
  // Connecting roads
  { from: LOCATIONS.HARBOR, to: LOCATIONS.MARKET },
  { from: LOCATIONS.TEMPLE, to: LOCATIONS.LIGHTHOUSE },
  { from: LOCATIONS.AMPHITHEATER, to: LOCATIONS.LIGHTHOUSE },
  { from: LOCATIONS.AMPHITHEATER, to: LOCATIONS.TEMPLE },
];

// Distance from point to line segment
function distanceToSegment(
  px: number, pz: number,
  x1: number, z1: number,
  x2: number, z2: number
): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const lengthSq = dx * dx + dz * dz;

  if (lengthSq === 0) {
    // Segment is a point
    return Math.sqrt((px - x1) ** 2 + (pz - z1) ** 2);
  }

  // Project point onto line
  let t = ((px - x1) * dx + (pz - z1) * dz) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projZ = z1 + t * dz;

  return Math.sqrt((px - projX) ** 2 + (pz - projZ) ** 2);
}

// Check if point is on a road (returns 0-1, 1 = on road, 0 = off road)
function getRoadFactor(x: number, z: number): number {
  let minDist = Infinity;

  // Check distance to all road segments
  for (const seg of ROAD_SEGMENTS) {
    const dist = distanceToSegment(x, z, seg.from.x, seg.from.z, seg.to.x, seg.to.z);
    minDist = Math.min(minDist, dist);
  }

  // Check circular areas around locations (plazas)
  for (const loc of Object.values(LOCATIONS)) {
    const dist = Math.sqrt((x - loc.x) ** 2 + (z - loc.z) ** 2);
    minDist = Math.min(minDist, dist - 4); // 4 unit radius plazas
  }

  // Smooth falloff from road center to edge
  if (minDist < ROAD_WIDTH) {
    return 1;
  } else if (minDist < ROAD_WIDTH + ROAD_EDGE) {
    return 1 - (minDist - ROAD_WIDTH) / ROAD_EDGE;
  }
  return 0;
}

// Get terrain height AND road factor together to avoid computing road factor twice
function getTerrainData(x: number, z: number): { height: number; roadFactor: number } {
  const distFromCenter = Math.sqrt(x * x + z * z);
  const maxRadius = 60;

  // Island falloff - smooth dome shape
  const normalizedDist = distFromCenter / maxRadius;
  if (normalizedDist > 1) return { height: -2, roadFactor: 0 }; // Under water

  // Main island shape - gentler, flatter profile
  const islandBase = Math.cos(normalizedDist * Math.PI * 0.5) * 4;

  // Very gentle rolling hills
  const hillX = x * 0.04;
  const hillZ = z * 0.04;
  const hills = noise2D(hillX, hillZ) * 1.5 * (1 - normalizedDist);

  // Minimal detail noise
  const detailX = x * 0.1;
  const detailZ = z * 0.1;
  const detail = noise2D(detailX + 100, detailZ + 100) * 0.3;

  // Beach zone
  const beachZone = normalizedDist > 0.75 ? (normalizedDist - 0.75) / 0.25 : 0;
  const beachFlattening = 1 - beachZone * 0.9;

  let height = (islandBase + hills * beachFlattening + detail * beachFlattening);

  // Ensure beaches are just above water
  if (normalizedDist > 0.85) {
    height = Math.max(0.3, height * (1 - (normalizedDist - 0.85) / 0.15));
  } else {
    height = Math.max(0.5, height);
  }

  // Get road factor once
  const roadFactor = getRoadFactor(x, z);

  // Flatten terrain along roads
  if (roadFactor > 0) {
    const roadHeight = 1.0 + islandBase * 0.15;
    height = height * (1 - roadFactor) + roadHeight * roadFactor;
  }

  return { height, roadFactor };
}

// Create island heightmap - mostly flat with gentle slopes
function getTerrainHeight(x: number, z: number): number {
  const distFromCenter = Math.sqrt(x * x + z * z);
  const maxRadius = 60;

  // Island falloff - smooth dome shape
  const normalizedDist = distFromCenter / maxRadius;
  if (normalizedDist > 1) return -2; // Under water

  // Main island shape - gentler, flatter profile
  const islandBase = Math.cos(normalizedDist * Math.PI * 0.5) * 4; // Much flatter (was 12)

  // Very gentle rolling hills (reduced significantly)
  const hillX = x * 0.04;
  const hillZ = z * 0.04;
  const hills = noise2D(hillX, hillZ) * 1.5 * (1 - normalizedDist); // Reduced from 6 to 1.5

  // Minimal detail noise
  const detailX = x * 0.1;
  const detailZ = z * 0.1;
  const detail = noise2D(detailX + 100, detailZ + 100) * 0.3; // Reduced from 2 to 0.3

  // Beach zone (near edge)
  const beachZone = normalizedDist > 0.75 ? (normalizedDist - 0.75) / 0.25 : 0;
  const beachFlattening = 1 - beachZone * 0.9;

  let height = (islandBase + hills * beachFlattening + detail * beachFlattening);

  // Ensure beaches are just above water
  if (normalizedDist > 0.85) {
    height = Math.max(0.3, height * (1 - (normalizedDist - 0.85) / 0.15));
  } else {
    height = Math.max(0.5, height); // Minimum height of 0.5 for walkable areas
  }

  // Flatten terrain along roads significantly
  const roadFactor = getRoadFactor(x, z);
  if (roadFactor > 0) {
    // Make roads very flat
    const roadHeight = 1.0 + islandBase * 0.15; // Nearly flat roads
    height = height * (1 - roadFactor) + roadHeight * roadFactor;
  }

  return height;
}

// Pre-compute terrain geometry at module level to avoid blocking render
function createTerrainGeometry(): THREE.PlaneGeometry {
  const size = 150;
  const segments = 100; // Balanced resolution (10k vertices) - still smooth but GPU-friendly
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);

  // Rotate to be horizontal
  geo.rotateX(-Math.PI / 2);

  // Apply heightmap
  const positions = geo.attributes.position.array as Float32Array;
  const colorArray = new Float32Array(positions.length);

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];

    // Use combined function to get height and road factor together (avoids computing road factor twice)
    const { height, roadFactor } = getTerrainData(x, z);
    positions[i + 1] = height;

    // Base terrain color - lush green grass
    let r, g, b;
    if (height < 0.6) {
      // Sandy beach
      r = 0.93; g = 0.87; b = 0.73;
    } else if (height < 1.5) {
      // Light grass near beach
      r = 0.45; g = 0.72; b = 0.32;
    } else if (height < 3) {
      // Lush green grass
      r = 0.35; g = 0.65; b = 0.25;
    } else if (height < 5) {
      // Darker green
      r = 0.28; g = 0.55; b = 0.20;
    } else {
      // Hilltop grass
      r = 0.38; g = 0.58; b = 0.28;
    }

    // Blend with road color (light stone/cobblestone path)
    if (roadFactor > 0) {
      // Add subtle variation to road color
      const variation = noise2D(x * 0.3, z * 0.3) * 0.04;
      const roadR = 0.78 + variation;
      const roadG = 0.70 + variation;
      const roadB = 0.55 + variation;

      // Blend terrain with road
      r = r * (1 - roadFactor) + roadR * roadFactor;
      g = g * (1 - roadFactor) + roadG * roadFactor;
      b = b * (1 - roadFactor) + roadB * roadFactor;
    }

    colorArray[i] = r;
    colorArray[i + 1] = g;
    colorArray[i + 2] = b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  geo.computeVertexNormals();

  return geo;
}

// Cached terrain geometry (computed lazily, once)
let cachedTerrainGeometry: THREE.PlaneGeometry | null = null;

export function Terrain() {
  const [geometry, setGeometry] = useState<THREE.PlaneGeometry | null>(cachedTerrainGeometry);

  useEffect(() => {
    if (geometry) return; // Already computed

    // Use requestAnimationFrame to defer computation and allow UI to render first
    const frameId = requestAnimationFrame(() => {
      if (!cachedTerrainGeometry) {
        cachedTerrainGeometry = createTerrainGeometry();
      }
      setGeometry(cachedTerrainGeometry);
    });

    return () => cancelAnimationFrame(frameId);
  }, [geometry]);

  // Show nothing while computing - the Suspense fallback in Scene handles this
  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        flatShading={false}
        roughness={0.85}
      />
    </mesh>
  );
}

// Export height function for collision detection and locations for buildings
export { getTerrainHeight, LOCATIONS };
