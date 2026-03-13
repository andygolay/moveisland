import { Terrain } from './Terrain';
import { Water } from './Water';
import { Buildings } from './Buildings';

export function World() {
  return (
    <group>
      {/* Island Terrain */}
      <Terrain />

      {/* Mediterranean Sea */}
      <Water />

      {/* Santorini-style Buildings */}
      <Buildings />
    </group>
  );
}
