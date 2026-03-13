import { useRef, useEffect, Suspense, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

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

interface NFTBillboardProps {
  imageUrl: string;
  size?: number;
  heightOffset?: number;
}

// Inner component that loads texture
function NFTBillboardWithTexture({
  imageUrl,
  size,
  heightOffset,
}: {
  imageUrl: string;
  size: number;
  heightOffset: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  // Handle IPFS URLs
  let url = imageUrl;
  if (url.startsWith('ipfs://')) {
    url = url.replace('ipfs://', 'https://ipfs.io/ipfs/');
  }

  // Use drei's useTexture hook for better loading
  const texture = useTexture(url);

  useEffect(() => {
    if (texture) {
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Create rounded corner shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        radius: { value: 0.15 }, // Corner radius (0-0.5)
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

  return (
    <group position={[0, heightOffset, 0]}>
      <mesh ref={meshRef} castShadow material={shaderMaterial}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

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

// Placeholder while loading
function NFTPlaceholder({ size, heightOffset }: { size: number; heightOffset: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color('#FFD93D') },
        radius: { value: 0.15 },
      },
      vertexShader: roundedVertexShader,
      fragmentShader: placeholderFragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

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

export function NFTBillboard({
  imageUrl,
  size = 1.0,
  heightOffset = 1.2,
}: NFTBillboardProps) {
  // If no URL, show placeholder
  if (!imageUrl || imageUrl.trim() === '') {
    return <NFTPlaceholder size={size} heightOffset={heightOffset} />;
  }

  return (
    <Suspense fallback={<NFTPlaceholder size={size} heightOffset={heightOffset} />}>
      <NFTBillboardWithTexture
        imageUrl={imageUrl}
        size={size}
        heightOffset={heightOffset}
      />
    </Suspense>
  );
}
