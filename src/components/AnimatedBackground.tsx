"use client";

import { useEffect, useState } from "react";
import { backgroundThemes, BackgroundTheme } from "@/lib/backgroundThemes";

interface AnimatedBackgroundProps {
    theme?: BackgroundTheme;
    onThemeChange?: (theme: BackgroundTheme) => void;
}

export default function AnimatedBackground({ theme = "cityHorizon", onThemeChange }: AnimatedBackgroundProps) {
    const [currentTheme, setCurrentTheme] = useState<BackgroundTheme>(theme);
    const [showSelector, setShowSelector] = useState(false);
    const config = backgroundThemes[currentTheme];

    useEffect(() => {
        createParticles();
        create3DShapes();
        if (config.buildings) {
            createCityBuildings();
        }
    }, [currentTheme]);

    const handleThemeChange = (newTheme: BackgroundTheme) => {
        setCurrentTheme(newTheme);
        onThemeChange?.(newTheme);
        setShowSelector(false);

        // Clear and recreate elements
        const particles = document.getElementById('particles');
        const shapes = document.getElementById('shapes');
        const buildings = document.getElementById('buildings');
        if (particles) particles.innerHTML = '';
        if (shapes) shapes.innerHTML = '';
        if (buildings) buildings.innerHTML = '';
    };

    return (
        <>
            <div className="crm-background" style={{ background: config.gradient }}>
                {/* Radial Blur Effects */}
                {config.blurs.map((blur, index) => (
                    <div
                        key={`blur-${index}`}
                        className="radial-blur"
                        style={{
                            background: `radial-gradient(circle, ${blur.color}, transparent)`,
                            ...blur.position,
                        }}
                    />
                ))}

                {/* Animated Grid */}
                <div
                    className="animated-grid"
                    style={{
                        backgroundImage: `
              linear-gradient(${config.grid.color} 1px, transparent 1px),
              linear-gradient(90deg, ${config.grid.color} 1px, transparent 1px)
            `,
                        backgroundSize: `${config.grid.size} ${config.grid.size}`,
                    }}
                />

                {/* City Buildings (if enabled) */}
                {config.buildings && <div className="city-buildings" id="buildings" />}

                {/* Particles Container */}
                <div className="particles-layer" id="particles" />

                {/* 3D Shapes Container */}
                <div className="geometric-shapes" id="shapes" />
            </div>

            {/* Theme Selector Button */}
            <button
                onClick={() => setShowSelector(!showSelector)}
                className="fixed bottom-6 right-6 z-50 bg-black/80 backdrop-blur-md border border-gleec-cyan/30 rounded-full p-3 hover:bg-black/90 hover:border-gleec-cyan/60 transition-all"
                title="Change Background"
            >
                <svg className="w-6 h-6 text-gleec-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
            </button>

            {/* Theme Selector Panel */}
            {showSelector && (
                <div className="fixed bottom-20 right-6 z-50 bg-black/90 backdrop-blur-xl border border-gleec-cyan/30 rounded-2xl p-4 w-80 max-h-96 overflow-y-auto">
                    <h3 className="text-gleec-cyan font-bold mb-3 text-sm">SELECT BACKGROUND</h3>
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(backgroundThemes) as BackgroundTheme[]).map((themeKey) => (
                            <button
                                key={themeKey}
                                onClick={() => handleThemeChange(themeKey)}
                                className={`p-3 rounded-lg border transition-all text-xs ${currentTheme === themeKey
                                        ? 'border-gleec-cyan bg-gleec-cyan/10 text-gleec-cyan'
                                        : 'border-white/10 bg-white/5 text-white/70 hover:border-gleec-cyan/50 hover:bg-white/10'
                                    }`}
                            >
                                {backgroundThemes[themeKey].name}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

// Generate random particles
function createParticles() {
    const particlesContainer = document.getElementById('particles');
    if (!particlesContainer) return;

    const particleCount = window.innerWidth < 768 ? 20 : 50;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = Math.random() * 100 + 'vh';

        const size = Math.random() * 30 + 10;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        particle.style.animationDelay = Math.random() * 5 + 's';

        particlesContainer.appendChild(particle);
    }
}

// Generate 3D cubes
function create3DShapes() {
    const shapesContainer = document.getElementById('shapes');
    if (!shapesContainer) return;

    const shapeCount = window.innerWidth < 768 ? 8 : 15;

    for (let i = 0; i < shapeCount; i++) {
        const cube = document.createElement('div');
        cube.className = 'cube-3d';

        cube.style.left = Math.random() * 90 + '%';
        cube.style.top = Math.random() * 90 + '%';

        const size = Math.random() * 60 + 40;
        cube.style.width = size + 'px';
        cube.style.height = size + 'px';

        cube.style.animationDuration = (Math.random() * 15 + 15) + 's';

        shapesContainer.appendChild(cube);
    }
}

// Create city skyline buildings
function createCityBuildings() {
    const buildingsContainer = document.getElementById('buildings');
    if (!buildingsContainer) return;

    const buildingCount = window.innerWidth < 768 ? 8 : 15;

    for (let i = 0; i < buildingCount; i++) {
        const building = document.createElement('div');
        building.className = 'city-building';

        const width = Math.random() * 60 + 40;
        const height = Math.random() * 150 + 100;

        building.style.width = width + 'px';
        building.style.height = height + 'px';
        building.style.left = (i * (100 / buildingCount)) + '%';
        building.style.bottom = '0';

        buildingsContainer.appendChild(building);
    }
}
