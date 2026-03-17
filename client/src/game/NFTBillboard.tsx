import { useRef, useEffect, useMemo, useState, Component } from 'react';
import type { ReactNode } from 'react';
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

// Load image using native HTMLImageElement (outside THREE.js to prevent uncaught errors)
function loadImageSafely(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeoutId = setTimeout(() => {
      img.src = ''; // Cancel load
      reject(new Error('Image load timeout'));
    }, IMAGE_LOAD_TIMEOUT);

    img.onload = () => {
      clearTimeout(timeoutId);
      resolve(img);
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// Try loading image from multiple IPFS gateways
async function loadImageWithFallback(originalUrl: string): Promise<HTMLImageElement> {
  const isIpfs = isIpfsUrl(originalUrl);

  if (!isIpfs) {
    // Non-IPFS URL, just try to load it directly
    return loadImageSafely(originalUrl);
  }

  // Try each gateway in order
  let lastError: Error = new Error('No gateways available');

  for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
    const url = convertToGatewayUrl(originalUrl, i);
    console.log(`[NFTBillboard] Trying gateway ${i + 1}/${IPFS_GATEWAYS.length}: ${url}`);

    try {
      const img = await loadImageSafely(url);
      console.log(`[NFTBillboard] Successfully loaded from gateway ${i + 1}`);
      return img;
    } catch (err) {
      console.warn(`[NFTBillboard] Gateway ${i + 1} failed:`, err);
      lastError = err instanceof Error ? err : new Error('Unknown error');
    }
  }

  throw lastError;
}

// Create THREE.Texture from already-loaded HTMLImageElement (safe, no network errors)
function createTextureFromImage(img: HTMLImageElement): THREE.Texture {
  const texture = new THREE.Texture(img);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

// Safe texture loader - loads image first, then creates texture
function useTextureWithFallback(
  originalUrl: string,
  onLoad?: () => void,
  onError?: (error: Error) => void
): THREE.Texture | null {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // Use refs for callbacks to avoid effect re-runs
  const onLoadRef = useRef(onLoad);
  const onErrorRef = useRef(onError);
  onLoadRef.current = onLoad;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!originalUrl) return;

    let cancelled = false;

    // Load image safely outside THREE.js, then create texture
    loadImageWithFallback(originalUrl)
      .then((img) => {
        if (cancelled) return;

        try {
          const tex = createTextureFromImage(img);
          setTexture(tex);
          console.log('[NFTBillboard] Texture created successfully');
          onLoadRef.current?.();
        } catch (e) {
          console.warn('[NFTBillboard] Error creating texture:', e);
          setTexture(null);
          onErrorRef.current?.(new Error('Failed to create texture'));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[NFTBillboard] All image load attempts failed:', err);
        setTexture(null);
        onErrorRef.current?.(err);
      });

    return () => {
      cancelled = true;
    };
  }, [originalUrl]);

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

// Create a canvas texture with text
function createTextTexture(text: string, bgColor: string, textColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Rounded rectangle background
  const radius = 30;
  ctx.fillStyle = bgColor;
  ctx.beginPath();
  ctx.roundRect(10, 10, 236, 236, radius);
  ctx.fill();

  // Text
  ctx.fillStyle = textColor;
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Placeholder while loading or on error
function NFTPlaceholder({
  size,
  heightOffset,
  isError = false,
  isLoading = false,
}: {
  size: number;
  heightOffset: number;
  isError?: boolean;
  isLoading?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Create texture with appropriate text
  const texture = useMemo(() => {
    if (isError) {
      return createTextTexture('Error', '#FF6B6B', '#FFFFFF');
    } else if (isLoading) {
      return createTextTexture('Loading...', '#3A3A4A', '#AAAAAA');
    } else {
      return createTextTexture('No Image', '#FFD93D', '#333333');
    }
  }, [isError, isLoading]);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, [texture]);

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
      <mesh ref={meshRef} castShadow material={material}>
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
  // Use a ref to track current status to avoid stale closure issues
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (status === 'loaded') return;

    const timer = setTimeout(() => {
      if (statusRef.current !== 'loaded') {
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
      {/* Show loading placeholder while image loads */}
      {status === 'loading' && (
        <NFTPlaceholder size={size} heightOffset={heightOffset} isLoading />
      )}
    </TextureErrorBoundary>
  );
}
