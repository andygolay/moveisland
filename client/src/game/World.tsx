import { Terrain } from './Terrain';
import { Water } from './Water';
import { Buildings } from './Buildings';
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

      {/* Chess Tables - spread across the area */}
      {CHESS_TABLES.map((table) => (
        <ChessTable key={table.id} position={table} />
      ))}
    </group>
  );
}
