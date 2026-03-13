import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Water() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Custom water shader for vibrant Mediterranean look
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaterColor: { value: new THREE.Color('#00CED1') },      // Turquoise
      uWaterColorMid: { value: new THREE.Color('#1E90FF') },   // Dodger blue
      uWaterColorDeep: { value: new THREE.Color('#0066CC') },  // Deep azure
    }),
    []
  );

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;
    varying float vDistFromCenter;

    void main() {
      vUv = uv;

      vec3 pos = position;

      // Calculate distance from center for depth coloring
      vDistFromCenter = length(pos.xy) / 250.0;

      // Create gentle waves
      float wave1 = sin(pos.x * 0.05 + uTime * 0.5) * 0.4;
      float wave2 = sin(pos.y * 0.08 + uTime * 0.3) * 0.3;
      float wave3 = sin((pos.x + pos.y) * 0.03 + uTime * 0.7) * 0.2;
      float wave4 = sin(pos.x * 0.02 - uTime * 0.2) * 0.5;

      pos.z = wave1 + wave2 + wave3 + wave4;
      vElevation = pos.z;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 uWaterColor;
    uniform vec3 uWaterColorMid;
    uniform vec3 uWaterColorDeep;
    uniform float uTime;
    varying vec2 vUv;
    varying float vElevation;
    varying float vDistFromCenter;

    void main() {
      // Mix colors based on distance from shore and wave height
      float depthFactor = smoothstep(0.1, 0.6, vDistFromCenter);

      // Shallow water is turquoise, deep water is azure
      vec3 shallowColor = uWaterColor;
      vec3 midColor = uWaterColorMid;
      vec3 deepColor = uWaterColorDeep;

      vec3 color;
      if (depthFactor < 0.5) {
        color = mix(shallowColor, midColor, depthFactor * 2.0);
      } else {
        color = mix(midColor, deepColor, (depthFactor - 0.5) * 2.0);
      }

      // Add wave highlights based on elevation
      float waveHighlight = smoothstep(0.3, 0.8, vElevation + 0.5) * 0.15;
      color += vec3(waveHighlight);

      // Add subtle animated shimmer/sparkle
      float shimmer = sin(vUv.x * 80.0 + uTime * 2.0) * sin(vUv.y * 80.0 + uTime * 1.5) * 0.08;
      shimmer *= smoothstep(0.4, 0.7, vElevation + 0.5); // Only on wave peaks
      color += vec3(shimmer);

      // Slight transparency
      float alpha = 0.9;

      gl_FragColor = vec4(color, alpha);
    }
  `;

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
    >
      <planeGeometry args={[500, 500, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
