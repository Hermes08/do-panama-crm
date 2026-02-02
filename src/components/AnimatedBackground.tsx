"use client";

import { useEffect } from "react";

export default function AnimatedBackground() {
    useEffect(() => {
        createParticles();
        create3DShapes();
    }, []);

    return (
        <div className="crm-background">
            {/* Radial Blur Effects */}
            <div className="radial-blur blur-red"></div>
            <div className="radial-blur blur-cyan"></div>
            <div className="radial-blur blur-purple"></div>

            {/* Animated Grid */}
            <div className="animated-grid"></div>

            {/* Particles Container */}
            <div className="particles-layer" id="particles"></div>

            {/* 3D Shapes Container */}
            <div className="geometric-shapes" id="shapes"></div>
        </div>
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

        // Random position
        particle.style.left = Math.random() * 100 + 'vw';
        particle.style.top = Math.random() * 100 + 'vh';

        // Random size
        const size = Math.random() * 30 + 10;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';

        // Random duration
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

        // Random position
        cube.style.left = Math.random() * 90 + '%';
        cube.style.top = Math.random() * 90 + '%';

        // Random size
        const size = Math.random() * 60 + 40;
        cube.style.width = size + 'px';
        cube.style.height = size + 'px';

        // Random duration
        cube.style.animationDuration = (Math.random() * 15 + 15) + 's';

        shapesContainer.appendChild(cube);
    }
}
