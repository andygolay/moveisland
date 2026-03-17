import { Canvas } from '@react-three/fiber';
import { Sky, Environment } from '@react-three/drei';
import { Suspense, Component, ReactNode, useState, useCallback } from 'react';
import { World } from './World';
import { Avatar } from './Avatar';
import { CameraController } from './CameraController';
import { PlayerController } from './PlayerController';
import { OtherPlayers } from './OtherPlayers';
import { ChessGameCamera } from './ChessGameView';

// Error boundary for the entire 3D scene
interface SceneErrorBoundaryProps {
  children: ReactNode;
  onRetry: () => void;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SceneErrorBoundary extends Component<SceneErrorBoundaryProps, SceneErrorBoundaryState> {
  constructor(props: SceneErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): SceneErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Scene] Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ marginBottom: '1rem' }}>Scene Error</h2>
          <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
            Something went wrong loading the 3D scene.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry();
            }}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Fallback component shown when WebGL context is lost
function ContextLostFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h2 style={{ marginBottom: '1rem' }}>Graphics Context Lost</h2>
      <p style={{ marginBottom: '1rem', opacity: 0.8 }}>
        The 3D graphics context was lost. This can happen due to GPU issues.
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Reload Scene
      </button>
    </div>
  );
}

export function Scene() {
  const [contextLost, setContextLost] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  const handleRetry = useCallback(() => {
    setContextLost(false);
    setSceneKey(k => k + 1);
  }, []);

  const handleContextLost = useCallback((event: WebGLContextEvent) => {
    console.warn('[Scene] WebGL context lost');
    event.preventDefault(); // Allows context restoration
    setContextLost(true);
  }, []);

  const handleContextRestored = useCallback(() => {
    console.log('[Scene] WebGL context restored');
    setContextLost(false);
  }, []);

  if (contextLost) {
    return <ContextLostFallback onRetry={handleRetry} />;
  }

  return (
    <SceneErrorBoundary onRetry={handleRetry}>
      <Canvas
        key={sceneKey}
        shadows
        camera={{ position: [0, 10, 20], fov: 60 }}
        style={{ width: '100vw', height: '100vh' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', handleContextLost as EventListener);
          canvas.addEventListener('webglcontextrestored', handleContextRestored);
        }}
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
        <ChessGameCamera />
      </Suspense>
    </Canvas>
    </SceneErrorBoundary>
  );
}
