import { Canvas } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import { Suspense } from 'react';
import { World } from './World';
import { Avatar } from './Avatar';
import { CameraController } from './CameraController';
import { PlayerController } from './PlayerController';
import { OtherPlayers } from './OtherPlayers';

export function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 20], fov: 60 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[50, 100, 50]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={200}
        shadow-camera-left={-100}
        shadow-camera-right={100}
        shadow-camera-top={100}
        shadow-camera-bottom={-100}
      />

      {/* Sky and Environment */}
      <Sky
        distance={450000}
        sunPosition={[100, 50, 100]}
        inclination={0.5}
        azimuth={0.25}
        rayleigh={0.5}
      />
      <Environment preset="sunset" />

      {/* Fog for atmosphere */}
      <fog attach="fog" args={['#87CEEB', 50, 300]} />

      <Suspense fallback={null}>
        {/* Game World */}
        <World />

        {/* Player Avatar */}
        <Avatar />

        {/* Other Players (Multiplayer) */}
        <OtherPlayers />

        {/* Controllers */}
        <PlayerController />
        <CameraController />
      </Suspense>
    </Canvas>
  );
}
