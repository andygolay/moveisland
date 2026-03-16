import { Terrain } from './Terrain';
import { Water } from './Water';
import { Buildings } from './Buildings';
import { Vegetation } from './Vegetation';
import { Landmarks } from './Landmarks';
import { ChessTable, CHESS_TABLES } from './ChessTable';

export function World() {
  return (
    <group>
      {/* Island Terrain */}
      <Terrain />

      {/* Mediterranean Sea */}
      <Water />

      {/* Santorini-style Buildings */}
      <Buildings />

      {/* Trees and Bushes */}
      <Vegetation />

      {/* Columns and Plaza */}
      <Landmarks />

      {/* Chess Tables */}
      {CHESS_TABLES.map((table) => (
        <ChessTable key={table.id} position={table} />
      ))}
    </group>
  );
}
