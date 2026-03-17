import { useRef, useEffect, useMemo, useState, Component, ReactNode } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Timeout for slow image loads (8 seconds)
const IMAGE_LOAD_TIMEOUT = 8000;

// Shader for rounded corners
const roundedVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const roundedFragmentShader = `
  uniform sampler2D map;
  uniform float radius;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = abs(uv - center);
    vec2 corner = vec2(0.5 - radius, 0.5 - radius);

    float dist = length(max(pos - corner, 0.0));
    float alpha = 1.0 - smoothstep(radius - 0.02, radius, dist);

    vec4 texColor = texture2D(map, uv);
    gl_FragColor = vec4(texColor.rgb, texColor.a * alpha);
  }
`;

// Shader for rounded placeholder (solid color)
const placeholderFragmentShader = `
  uniform vec3 color;
  uniform float radius;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5, 0.5);
    vec2 pos = abs(uv - center);
    vec2 corner = vec2(0.5 - radius, 0.5 - radius);

    float dist = length(max(pos - corner, 0.0));
    float alpha = 1.0 - smoothstep(radius - 0.02, radius, dist);

    gl_FragColor = vec4(color, alpha);
  }
`;

interface NFTBillboardProps {
  imageUrl: string;
  size?: number;
  heightOffset?: number;
  onLoadError?: () => void;
  onLoadSuccess?: () => void;
}

// IPFS gateways in order of preference
const IPFS_GATEWAYS = [
  'https://nftstorage.link/ipfs/',
  'https://dweb.link/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
];

// Extract CID from various IPFS URL formats
function extractIpfsCid(url: string): string | null {
  // ipfs:// protocol
  if (url.startsWith('ipfs://')) {
    return url.slice(7);
  }
  // HTTP gateway URLs
  const gatewayMatch = url.match(/\/ipfs\/([^?#]+)/);
  if (gatewayMatch) {
    return gatewayMatch[1];
  }
  return null;
}

// Convert IPFS URL to HTTP gateway with index for fallback
function convertToGatewayUrl(url: string, gatewayIndex = 0): string {
  const cid = extractIpfsCid(url);
  if (cid) {
    const gateway = IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length];
    return `${gateway}${cid}`;
  }
  return url;
}

// Check if URL is IPFS-based
function isIpfsUrl(url: string): boolean {
  return url.startsWith('ipfs://') || url.includes('/ipfs/');
}

// Manual texture loader with error handling and IPFS gateway fallback
function useTextureWithFallback(
  originalUrl: string,
  onLoad?: () => void,
  onError?: (error: Error) => void
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [gatewayIndex, setGatewayIndex] = useState(0);

  useEffect(() => {
    if (!originalUrl) return;

    const isIpfs = isIpfsUrl(originalUrl);
    const url = isIpfs ? convertToGatewayUrl(originalUrl, gatewayIndex) : originalUrl;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    let cancelled = false;

    console.log(`[NFTBillboard] Loading texture from: ${url}${isIpfs ? ` (gateway ${gatewayIndex + 1}/${IPFS_GATEWAYS.length})` : ''}`);

    loader.load(
      url,
      (loadedTexture) => {
        if (cancelled) return;
        try {
          loadedTexture.minFilter = THREE.LinearFilter;
          loadedTexture.magFilter = THREE.LinearFilter;
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.needsUpdate = true;
          setTexture(loadedTexture);
          console.log('[NFTBillboard] Texture loaded successfully');
          onLoad?.();
        } catch (e) {
          console.warn('[NFTBillboard] Error processing texture:', e);
          setTexture(null);
          onError?.(new Error('Failed to process texture'));
        }
      },
      undefined,
      (err: unknown) => {
        if (cancelled) return;

        // Extract error message safely
        let errorMessage = 'Failed to load texture';
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (err && typeof err === 'object' && 'message' in err) {
          errorMessage = String((err as { message: unknown }).message);
        }

        console.warn(`[NFTBillboard] Failed to load texture from gateway ${gatewayIndex + 1}:`, errorMessage);

        // Try next gateway if this is an IPFS URL
        if (isIpfs && gatewayIndex < IPFS_GATEWAYS.length - 1) {
          console.log('[NFTBillboard] Trying next IPFS gateway...');
          setGatewayIndex(i => i + 1);
        } else {
          // All gateways failed or not IPFS
          console.warn('[NFTBillboard] All gateways failed, giving up');
          setTexture(null);
          onError?.(new Error(errorMessage));
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [originalUrl, gatewayIndex, onLoad, onError]);

  return texture;
}

// Inner component that loads texture
function NFTBillboardWithTexture({
  imageUrl,
  size,
  heightOffset,
  onLoadError,
  onLoadSuccess,
}: {
  imageUrl: string;
  size: number;
  heightOffset: number;
  onLoadError?: () => void;
  onLoadSuccess?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Pass imageUrl directly - hook handles IPFS gateway conversion with fallback
  const texture = useTextureWithFallback(imageUrl, onLoadSuccess, onLoadError);

  // Create rounded corner shader material
  const shaderMaterial = useMemo(() => {
    if (!texture) return null;
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        radius: { value: 0.15 },
      },
      vertexShader: roundedVertexShader,
      fragmentShader: roundedFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, [texture]);

  // Update texture uniform when it changes
  useEffect(() => {
    if (shaderMaterial && texture) {
      shaderMaterial.uniforms.map.value = texture;
    }
  }, [shaderMaterial, texture]);

  // Billboard effect - always face camera
  useFrame(() => {
    if (meshRef.current) {
      const cameraWorldPos = new THREE.Vector3();
      camera.getWorldPosition(cameraWorldPos);
      const billboardWorldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(billboardWorldPos);
      const direction = new THREE.Vector3()
        .subVectors(cameraWorldPos, billboardWorldPos)
        .normalize();
      const angle = Math.atan2(direction.x, direction.z);
      meshRef.current.rotation.y = angle;
    }
  });

  // If texture hasn't loaded yet, show nothing (parent will show placeholder)
  if (!texture || !shaderMaterial) {
    return null;
  }

  return (
    <group position={[0, heightOffset, 0]}>
      <mesh ref={meshRef} castShadow material={shaderMaterial}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

// Placeholder while loading or on error
function NFTPlaceholder({
  size,
  heightOffset,
  isError = false,
}: {
  size: number;
  heightOffset: number;
  isError?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        // Yellow for loading, orange-red for error
        color: { value: new THREE.Color(isError ? '#FF6B6B' : '#FFD93D') },
        radius: { value: 0.15 },
      },
      vertexShader: roundedVertexShader,
      fragmentShader: placeholderFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, [isError]);

  useFrame(() => {
    if (meshRef.current) {
      const cameraWorldPos = new THREE.Vector3();
      camera.getWorldPosition(cameraWorldPos);
      const billboardWorldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(billboardWorldPos);
      const direction = new THREE.Vector3()
        .subVectors(cameraWorldPos, billboardWorldPos)
        .normalize();
      const angle = Math.atan2(direction.x, direction.z);
      meshRef.current.rotation.y = angle;
    }
  });

  return (
    <group position={[0, heightOffset, 0]}>
      <mesh ref={meshRef} castShadow material={shaderMaterial}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

// Error boundary for catching any React errors
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
  onError?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class TextureErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[NFTBillboard] Error boundary caught:', error);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Global state for NFT load status (simple event-based)
type NFTLoadListener = (status: 'loading' | 'loaded' | 'error') => void;
const listeners = new Set<NFTLoadListener>();
let currentStatus: 'loading' | 'loaded' | 'error' = 'loading';
let retryCount = 0;

export function subscribeToNFTLoadStatus(listener: NFTLoadListener): () => void {
  listeners.add(listener);
  listener(currentStatus); // Immediately call with current status
  return () => listeners.delete(listener);
}

export function retryNFTLoad(): void {
  retryCount++;
  currentStatus = 'loading';
  listeners.forEach(l => l('loading'));
}

export function getNFTRetryCount(): number {
  return retryCount;
}

function setNFTLoadStatus(status: 'loading' | 'loaded' | 'error') {
  currentStatus = status;
  listeners.forEach(l => l(status));
}

export function NFTBillboard({
  imageUrl,
  size = 1.0,
  heightOffset = 1.2,
}: NFTBillboardProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [timedOut, setTimedOut] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Listen for retry requests
  useEffect(() => {
    return subscribeToNFTLoadStatus((newStatus) => {
      if (newStatus === 'loading' && status === 'error') {
        // Trigger retry by changing key
        setRetryKey(k => k + 1);
        setStatus('loading');
        setTimedOut(false);
      }
    });
  }, [status]);

  // Timeout for slow image loads
  useEffect(() => {
    if (status === 'loaded') return;

    const timer = setTimeout(() => {
      if (status !== 'loaded') {
        console.warn('[NFTBillboard] Load timeout for:', imageUrl);
        setTimedOut(true);
        setStatus('error');
        setNFTLoadStatus('error');
      }
    }, IMAGE_LOAD_TIMEOUT);

    return () => clearTimeout(timer);
  }, [imageUrl, retryKey, status]);

  const handleLoadSuccess = () => {
    setStatus('loaded');
    setNFTLoadStatus('loaded');
  };

  const handleLoadError = () => {
    setStatus('error');
    setNFTLoadStatus('error');
  };

  // If no URL, show placeholder
  if (!imageUrl || imageUrl.trim() === '') {
    return <NFTPlaceholder size={size} heightOffset={heightOffset} />;
  }

  // If error or timed out, show error placeholder
  if (status === 'error' || timedOut) {
    return <NFTPlaceholder size={size} heightOffset={heightOffset} isError />;
  }

  return (
    <TextureErrorBoundary
      fallback={<NFTPlaceholder size={size} heightOffset={heightOffset} isError />}
      onError={handleLoadError}
    >
      <NFTBillboardWithTexture
        key={retryKey}
        imageUrl={imageUrl}
        size={size}
        heightOffset={heightOffset}
        onLoadError={handleLoadError}
        onLoadSuccess={handleLoadSuccess}
      />
      {/* Show placeholder while loading */}
      {status === 'loading' && (
        <NFTPlaceholder size={size} heightOffset={heightOffset} />
      )}
    </TextureErrorBoundary>
  );
}
