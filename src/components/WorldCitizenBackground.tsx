"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera, Environment, Stars, Sparkles, Text } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function Card() {
    const mesh = useRef<THREE.Mesh>(null);

    // Card dimensions (standard credit card ratio)
    const width = 3.375;
    const height = 2.125;
    const depth = 0.05;

    useFrame((state) => {
        if (mesh.current) {
            // Slow subtle rotation
            mesh.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.2) * 0.1;
            mesh.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.2;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
            <group>
                {/* The Main Glass Card */}
                <mesh ref={mesh}>
                    <boxGeometry args={[width, height, depth]} />
                    <meshPhysicalMaterial
                        color="#ffffff"
                        metalness={0.1}
                        roughness={0.05}
                        transmission={0.95} // Glass-like transmission
                        thickness={0.5} // Refraction
                        clearcoat={1}
                        clearcoatRoughness={0}
                        ior={1.5} // Index of Refraction for glass
                        iridescence={1}
                        iridescenceIOR={1.3}
                    />
                </mesh>

                {/* Card Border / Edge Highlight */}
                <mesh>
                    <boxGeometry args={[width + 0.02, height + 0.02, depth - 0.01]} />
                    <meshBasicMaterial color="#d4af37" wireframe={true} opacity={0.3} transparent />
                </mesh>

                {/* "World Citizen" Text on Card */}
                {/* Using standard font or attempting to load one. If it fails, R3F usually warns but doesn't crash if we handle it or use default. 
                 For safety, I'll remove the specific font prop to use the default THREE font which is safe, 
                 or I can assume a font exists. 
                 Let's use default font for now to avoid errors. 
             */}
                <Text
                    position={[0, 0.3, depth / 2 + 0.01]}
                    fontSize={0.25}
                    color="#d4af37" // Gold
                    anchorX="center"
                    anchorY="middle"
                >
                    WORLD CITIZEN
                </Text>

                <Text
                    position={[0, -0.2, depth / 2 + 0.01]}
                    fontSize={0.1}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.2}
                >
                    PASSPORT TO FREEDOM
                </Text>

                {/* Holographic Earth / Wireframe Sphere */}
                <mesh position={[0.8, -0.5, depth / 2 + 0.01]} scale={0.4}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" wireframe={true} opacity={0.2} transparent />
                </mesh>
                {/* Holographic Chip */}
                <mesh position={[-1.2, 0.2, depth / 2 + 0.01]}>
                    <planeGeometry args={[0.5, 0.4]} />
                    <meshBasicMaterial color="#d4af37" opacity={0.6} transparent />
                </mesh>

            </group>
        </Float>
    );
}

export default function WorldCitizenBackground() {
    return (
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 6]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} color="#d4af37" intensity={0.5} />

                <Card />

                {/* Environment for reflections */}
                <Environment preset="city" />

                {/* Background elements */}
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Sparkles count={100} scale={10} size={2} speed={0.4} opacity={0.5} color="#d4af37" />
            </Canvas>
        </div>
    );
}
