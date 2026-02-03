"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera, Environment, Stars, Sparkles, Text, RoundedBox } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function Card() {
    const mesh = useRef<THREE.Mesh>(null);

    // Card dimensions (standard credit card ratio, scaled)
    const width = 3.375;
    const height = 2.125;
    const depth = 0.05;

    useFrame((state) => {
        if (mesh.current) {
            // Slow subtle rotation
            mesh.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.1;
            mesh.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.4) * 0.1 + 0.2; // Slight offset
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <group rotation={[0, -0.2, 0]}> {/* Initial rotation to face slightly left */}
                {/* The Main Dark Glass Card */}
                <mesh ref={mesh}>
                    <RoundedBox args={[width, height, depth]} radius={0.15} smoothness={4}>
                        <meshPhysicalMaterial
                            color="#0f1014" // Brand Navy
                            metalness={0.8}
                            roughness={0.2}
                            transmission={0.2} // Darker glass
                            thickness={0.5}
                            clearcoat={1}
                            clearcoatRoughness={0.1}
                            ior={1.5}
                        />
                    </RoundedBox>
                </mesh>

                {/* Gold Border / Edge Highlight - Manually creating a slightly larger box for border effect is tricky with RoundedBox. 
                    Instead, we'll use a slightly larger RoundedBox behind or just rely on the rim light.
                    Let's add a thin gold frame using a second RoundedBox slightly larger? 
                    Actually, let's keep it simple and elegant with just the dark glass and gold text.
                */}

                {/* "World Citizen" Text on Card */}
                <Text
                    position={[0, 0.3, depth / 2 + 0.02]}
                    fontSize={0.25}
                    color="#d4af37" // Gold
                    anchorX="center"
                    anchorY="middle"
                    font="/fonts/Geist-Bold.woff" // Attempting standard font or fallback
                >
                    WORLD CITIZEN
                </Text>

                <Text
                    position={[0, -0.2, depth / 2 + 0.02]}
                    fontSize={0.1}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    letterSpacing={0.2}
                >
                    PASSPORT TO FREEDOM
                </Text>

                {/* Holographic Earth / Wireframe Sphere - Gold */}
                <mesh position={[0.9, -0.5, depth / 2 + 0.02]} scale={0.35}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshBasicMaterial color="#d4af37" wireframe={true} opacity={0.3} transparent />
                </mesh>

                {/* Holographic Chip - Gold */}
                <mesh position={[-1.1, 0.2, depth / 2 + 0.02]}>
                    <planeGeometry args={[0.5, 0.4]} />
                    <meshBasicMaterial color="#d4af37" opacity={0.8} transparent />
                </mesh>

            </group>
        </Float>
    );
}

export default function WorldCitizenBackground() {
    return (
        <div className="fixed bottom-4 right-4 w-[320px] h-[200px] z-50 pointer-events-none sm:block hidden">
            <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 5]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} color="#d4af37" intensity={0.5} />

                <Card />

                {/* Environment for reflections */}
                <Environment preset="city" />

                {/* Moving Stars/Sparkles inside to keep them contained to this small view? 
                    Actually, if we want background stars for the whole page, they should be separate.
                    The user said "make the card smaller... non intrusive".
                    The previous component provided the specific "World Citizen" card AND the background stars.
                    The User might still want the starry background on the page?
                    "make the card smaller... have it's own space... non intrusive to the text".
                    I should probably KEEP the stars as a full-page background in a SEPARATE component/canvas, 
                    OR just remove the stars from here and let this be JUST the card.
                    Given "non intrusive", I'll remove the stars from this small card canvas to avoid a weird square of stars.
                */}
            </Canvas>
        </div>
    );
}
