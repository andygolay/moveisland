import { useMemo } from 'react';
import { getTerrainHeight } from './Terrain';

// Chess table positions
export const CHESS_TABLES = [
  { id: 'table-1', x: 4, z: -5 },      // Right
  { id: 'table-2', x: 0, z: -5 },      // Center
  { id: 'table-3', x: -4, z: -5 },     // Left
] as const;

// Legacy export for backward compatibility
export const CHESS_TABLE_POSITION = CHESS_TABLES[0];

// How close player needs to be to interact
export const CHESS_INTERACTION_RADIUS = 3;

interface ChessTableProps {
  position?: { x: number; z: number };
}

export function ChessTable({ position }: ChessTableProps = {}) {
  const tablePos = position || CHESS_TABLES[0];
  const groundY = getTerrainHeight(tablePos.x, tablePos.z);

  // Generate checkerboard squares
  const squares = useMemo(() => {
    const result: { x: number; z: number; isLight: boolean }[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        result.push({
          x: (col - 3.5) * 0.15,
          z: (row - 3.5) * 0.15,
          isLight: (row + col) % 2 === 0,
        });
      }
    }
    return result;
  }, []);

  return (
    <group position={[tablePos.x, groundY, tablePos.z]}>
      {/* Stone pedestal base */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.5, 8]} />
        <meshStandardMaterial color="#8B8B83" roughness={0.9} />
      </mesh>

      {/* Table top (stone slab) */}
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.08, 1.4]} />
        <meshStandardMaterial color="#A9A9A0" roughness={0.85} />
      </mesh>

      {/* Checkerboard border */}
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.3, 0.02, 1.3]} />
        <meshStandardMaterial color="#4A3728" roughness={0.8} />
      </mesh>

      {/* Checkerboard squares */}
      {squares.map((sq, i) => (
        <mesh
          key={i}
          position={[sq.x, 0.62, sq.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.14, 0.01, 0.14]} />
          <meshStandardMaterial
            color={sq.isLight ? '#F0E4D4' : '#2C1810'}
            roughness={0.7}
          />
        </mesh>
      ))}

      {/* Two stone seats */}
      {/* Seat 1 */}
      <group position={[0, 0, -1.2]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.35, 0.4, 8]} />
          <meshStandardMaterial color="#8B8B83" roughness={0.9} />
        </mesh>
      </group>

      {/* Seat 2 */}
      <group position={[0, 0, 1.2]}>
        <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.35, 0.4, 8]} />
          <meshStandardMaterial color="#8B8B83" roughness={0.9} />
        </mesh>
      </group>

      {/* Full chess starting position */}
      {/* White back row */}
      <ChessPiece position={[-0.525, 0.68, -0.525]} isWhite type="rook" />
      <ChessPiece position={[-0.375, 0.68, -0.525]} isWhite type="knight" />
      <ChessPiece position={[-0.225, 0.68, -0.525]} isWhite type="bishop" />
      <ChessPiece position={[-0.075, 0.68, -0.525]} isWhite type="queen" />
      <ChessPiece position={[0.075, 0.68, -0.525]} isWhite type="king" />
      <ChessPiece position={[0.225, 0.68, -0.525]} isWhite type="bishop" />
      <ChessPiece position={[0.375, 0.68, -0.525]} isWhite type="knight" />
      <ChessPiece position={[0.525, 0.68, -0.525]} isWhite type="rook" />
      {/* White pawns */}
      <ChessPiece position={[-0.525, 0.68, -0.375]} isWhite type="pawn" />
      <ChessPiece position={[-0.375, 0.68, -0.375]} isWhite type="pawn" />
      <ChessPiece position={[-0.225, 0.68, -0.375]} isWhite type="pawn" />
      <ChessPiece position={[-0.075, 0.68, -0.375]} isWhite type="pawn" />
      <ChessPiece position={[0.075, 0.68, -0.375]} isWhite type="pawn" />
      <ChessPiece position={[0.225, 0.68, -0.375]} isWhite type="pawn" />
      <ChessPiece position={[0.375, 0.68, -0.375]} isWhite type="pawn" />
      <ChessPiece position={[0.525, 0.68, -0.375]} isWhite type="pawn" />

      {/* Black back row */}
      <ChessPiece position={[-0.525, 0.68, 0.525]} isWhite={false} type="rook" />
      <ChessPiece position={[-0.375, 0.68, 0.525]} isWhite={false} type="knight" />
      <ChessPiece position={[-0.225, 0.68, 0.525]} isWhite={false} type="bishop" />
      <ChessPiece position={[-0.075, 0.68, 0.525]} isWhite={false} type="queen" />
      <ChessPiece position={[0.075, 0.68, 0.525]} isWhite={false} type="king" />
      <ChessPiece position={[0.225, 0.68, 0.525]} isWhite={false} type="bishop" />
      <ChessPiece position={[0.375, 0.68, 0.525]} isWhite={false} type="knight" />
      <ChessPiece position={[0.525, 0.68, 0.525]} isWhite={false} type="rook" />
      {/* Black pawns */}
      <ChessPiece position={[-0.525, 0.68, 0.375]} isWhite={false} type="pawn" />
      <ChessPiece position={[-0.375, 0.68, 0.375]} isWhite={false} type="pawn" />
      <ChessPiece position={[-0.225, 0.68, 0.375]} isWhite={false} type="pawn" />
      <ChessPiece position={[-0.075, 0.68, 0.375]} isWhite={false} type="pawn" />
      <ChessPiece position={[0.075, 0.68, 0.375]} isWhite={false} type="pawn" />
      <ChessPiece position={[0.225, 0.68, 0.375]} isWhite={false} type="pawn" />
      <ChessPiece position={[0.375, 0.68, 0.375]} isWhite={false} type="pawn" />
      <ChessPiece position={[0.525, 0.68, 0.375]} isWhite={false} type="pawn" />
    </group>
  );
}

// Simple chess piece shapes
function ChessPiece({
  position,
  isWhite,
  type,
}: {
  position: [number, number, number];
  isWhite: boolean;
  type: 'pawn' | 'king' | 'queen' | 'rook' | 'bishop' | 'knight';
}) {
  const color = isWhite ? '#F5F5F0' : '#1A1A1A';
  const accent = isWhite ? '#E8E8E0' : '#2A2A2A';

  if (type === 'pawn') {
    return (
      <group position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.02, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.03, 0.04, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.06, 0]} castShadow>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (type === 'king') {
    return (
      <group position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.02, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.06, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.09, 0]} castShadow>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
        {/* Cross on top */}
        <mesh position={[0, 0.13, 0]} castShadow>
          <boxGeometry args={[0.01, 0.03, 0.01]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.14, 0]} castShadow>
          <boxGeometry args={[0.025, 0.01, 0.01]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (type === 'queen') {
    return (
      <group position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.02, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.04, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.035, 0.06, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.085, 0]} castShadow>
          <sphereGeometry args={[0.028, 8, 8]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
        {/* Crown points */}
        <mesh position={[0, 0.12, 0]} castShadow>
          <coneGeometry args={[0.02, 0.03, 8]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (type === 'bishop') {
    return (
      <group position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.02, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.035, 0]} castShadow>
          <cylinderGeometry args={[0.022, 0.03, 0.05, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* Mitre shape */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <coneGeometry args={[0.025, 0.05, 8]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.11, 0]} castShadow>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  if (type === 'knight') {
    return (
      <group position={position}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.04, 0.02, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.03, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.03, 0.04, 8]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        {/* Horse head shape - simplified */}
        <mesh position={[0.01, 0.07, 0]} rotation={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[0.025, 0.05, 0.02]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
        <mesh position={[0.025, 0.09, 0]} rotation={[0, 0, 0.5]} castShadow>
          <boxGeometry args={[0.015, 0.025, 0.015]} />
          <meshStandardMaterial color={accent} roughness={0.5} />
        </mesh>
      </group>
    );
  }

  // Rook
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.035, 0.04, 0.02, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.06, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.06, 0.02, 0.06]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      {/* Battlements */}
      <mesh position={[-0.02, 0.1, -0.02]} castShadow>
        <boxGeometry args={[0.015, 0.02, 0.015]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      <mesh position={[0.02, 0.1, -0.02]} castShadow>
        <boxGeometry args={[0.015, 0.02, 0.015]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      <mesh position={[-0.02, 0.1, 0.02]} castShadow>
        <boxGeometry args={[0.015, 0.02, 0.015]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      <mesh position={[0.02, 0.1, 0.02]} castShadow>
        <boxGeometry args={[0.015, 0.02, 0.015]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
    </group>
  );
}
