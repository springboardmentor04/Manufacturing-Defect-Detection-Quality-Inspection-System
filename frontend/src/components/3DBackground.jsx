import { Canvas } from "@react-three/fiber";
import { OrbitControls, Float, Sphere } from "@react-three/drei";

function FloatingSphere({ position, size }) {
  return (
    <Float
      speed={2}
      rotationIntensity={1}
      floatIntensity={2}
    >
      <Sphere
        args={[size, 32, 32]}
        position={position}
      >
        <meshStandardMaterial
          wireframe
          transparent
          opacity={0.35}
        />
      </Sphere>
    </Float>
  );
}

export default function ThreeDBackground() {
  return (
    <div className="absolute inset-0">
      <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
        <ambientLight intensity={0.5} />

        <pointLight
          position={[5, 5, 5]}
          intensity={2}
        />

        <FloatingSphere
          position={[-4, 2, -2]}
          size={1.5}
        />

        <FloatingSphere
          position={[4, -1, -3]}
          size={2}
        />

        <FloatingSphere
          position={[0, 3, -5]}
          size={1}
        />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}