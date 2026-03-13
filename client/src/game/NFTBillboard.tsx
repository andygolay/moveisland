import { useRef, useEffect, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

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
      <mesh ref={meshRef} castShadow>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// Placeholder while loading
function NFTPlaceholder({ size, heightOffset }: { size: number; heightOffset: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

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
      <mesh ref={meshRef} castShadow>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial color="#FFD93D" side={THREE.DoubleSide} />
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
