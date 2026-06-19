import React, { Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial, Sphere, PerspectiveCamera, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

const RobotShell = () => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.5;
    }
    if (groupRef.current) {
      const pulse = 0.5 + Math.sin(t * 2) * 0.2;
      groupRef.current.children.forEach((child) => {
        if (child instanceof THREE.PointLight) {
          child.intensity = (child.name === 'main' ? 2 : 1) * pulse;
        }
      });
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh ref={meshRef}>
          <octahedronGeometry args={[1, 2]} />
          <MeshDistortMaterial
            color="#2dd4bf"
            attach="material"
            distort={0.4}
            speed={2}
            roughness={0.1}
            metalness={0.9}
            emissive="#2dd4bf"
            emissiveIntensity={0.2}
          />
        </mesh>
      </Float>

      <Float speed={3} rotationIntensity={2} floatIntensity={1}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.5, 0.04, 16, 100]} />
          <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={2} />
        </mesh>
      </Float>

      <Float speed={1.5} rotationIntensity={1} floatIntensity={0.5}>
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <torusGeometry args={[1.8, 0.03, 16, 100]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={1.5} />
        </mesh>
      </Float>

      <Sphere args={[0.2, 32, 32]}>
        <MeshWobbleMaterial color="#fff" factor={0.5} speed={2} />
      </Sphere>

      <ambientLight intensity={0.4} />
      <pointLight name="main" position={[10, 10, 10]} intensity={2} color="#2dd4bf" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#6366f1" />
    </group>
  );
};

// Error boundary to prevent 3D crashes from killing the whole app
class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-teal-500/20 to-indigo-500/20 flex items-center justify-center">
              <span className="text-3xl">🤖</span>
            </div>
            <p className="text-gray-500 text-sm">3D View</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const RobotCanvas: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[400px] relative pointer-events-auto">
      <CanvasErrorBoundary>
        <Canvas shadows camera={{ position: [0, 0, 5], fov: 45 }}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} />
          <Suspense fallback={null}>
            <RobotShell />
            <OrbitControls 
              enableZoom={false} 
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.5}
              minPolarAngle={Math.PI / 3}
              maxPolarAngle={Math.PI / 1.5}
            />
          </Suspense>
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
};
