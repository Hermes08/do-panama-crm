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
        clearBackground();

        switch (config.type) {
            case "city":
                createCityBackground();
                break;
            case "waves":
                createWavesBackground();
                break;
            case "hexagons":
                createHexagonsBackground();
                break;
            case "circuit":
                createCircuitBackground();
                break;
            case "helix":
                createHelixBackground();
                break;
            case "stars":
                createStarsBackground();
                break;
            case "rain":
                createRainBackground();
                break;
            case "aurora":
                createAuroraBackground();
                break;
            case "triangles":
                createTrianglesBackground();
                break;
            case "network":
                createNetworkBackground();
                break;
        }
    }, [currentTheme]);

    const clearBackground = () => {
        const container = document.getElementById('bg-container');
        if (container) container.innerHTML = '';
    };

    const handleThemeChange = (newTheme: BackgroundTheme) => {
        setCurrentTheme(newTheme);
        onThemeChange?.(newTheme);
        setShowSelector(false);
    };

    return (
        <>
            <div className="crm-background" style={{ background: config.gradient }}>
                <div id="bg-container" className="absolute inset-0 overflow-hidden" />
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

// 1. City with buildings and particles
function createCityBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    // Buildings
    for (let i = 0; i < 15; i++) {
        const building = document.createElement('div');
        building.className = 'city-building';
        building.style.left = (i * 7) + '%';
        building.style.width = Math.random() * 60 + 40 + 'px';
        building.style.height = Math.random() * 150 + 100 + 'px';
        container.appendChild(building);
    }

    // Particles
    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'floating-particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        container.appendChild(particle);
    }
}

// 2. Animated waves
function createWavesBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    for (let i = 0; i < 4; i++) {
        const wave = document.createElement('div');
        wave.className = 'ocean-wave';
        wave.style.animationDuration = (15 + i * 5) + 's';
        wave.style.animationDelay = (i * 2) + 's';
        wave.style.bottom = (i * 15) + '%';
        container.appendChild(wave);
    }
}

// 3. Hexagonal grid
function createHexagonsBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    const rows = 8;
    const cols = 12;

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const hex = document.createElement('div');
            hex.className = 'hexagon';
            hex.style.left = (col * 70 + (row % 2) * 35) + 'px';
            hex.style.top = (row * 60) + 'px';
            hex.style.animationDelay = (Math.random() * 5) + 's';
            container.appendChild(hex);
        }
    }
}

// 4. Circuit board
function createCircuitBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'circuit-svg');

    for (let i = 0; i < 20; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', Math.random() * 100 + '%');
        line.setAttribute('y1', Math.random() * 100 + '%');
        line.setAttribute('x2', Math.random() * 100 + '%');
        line.setAttribute('y2', Math.random() * 100 + '%');
        line.setAttribute('stroke', 'rgba(0, 255, 65, 0.3)');
        line.setAttribute('stroke-width', '2');
        line.setAttribute('class', 'circuit-line');
        svg.appendChild(line);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', Math.random() * 100 + '%');
        circle.setAttribute('cy', Math.random() * 100 + '%');
        circle.setAttribute('r', '4');
        circle.setAttribute('fill', 'rgba(0, 255, 65, 0.6)');
        circle.setAttribute('class', 'circuit-node');
        svg.appendChild(circle);
    }

    container.appendChild(svg);
}

// 5. DNA Helix
function createHelixBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.setAttribute('class', 'helix-canvas');
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let angle = 0;
    function animateHelix() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 50; i++) {
            const y = (i / 50) * canvas.height;
            const x1 = canvas.width / 2 + Math.sin(angle + i * 0.2) * 100;
            const x2 = canvas.width / 2 + Math.sin(angle + i * 0.2 + Math.PI) * 100;

            ctx.fillStyle = 'rgba(212, 175, 55, 0.4)';
            ctx.beginPath();
            ctx.arc(x1, y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(x2, y, 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(212, 175, 55, 0.2)';
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(x2, y);
            ctx.stroke();
        }

        angle += 0.02;
        requestAnimationFrame(animateHelix);
    }
    animateHelix();
}

// 6. Constellation / Stars
function createStarsBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    const stars: { x: number, y: number, el: HTMLElement }[] = [];

    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        star.style.left = x + '%';
        star.style.top = y + '%';
        container.appendChild(star);
        stars.push({ x, y, el: star });
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'constellation-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';

    for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
            const dist = Math.sqrt(Math.pow(stars[i].x - stars[j].x, 2) + Math.pow(stars[i].y - stars[j].y, 2));
            if (dist < 15) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', stars[i].x + '%');
                line.setAttribute('y1', stars[i].y + '%');
                line.setAttribute('x2', stars[j].x + '%');
                line.setAttribute('y2', stars[j].y + '%');
                line.setAttribute('stroke', 'rgba(100, 200, 255, 0.2)');
                line.setAttribute('stroke-width', '1');
                svg.appendChild(line);
            }
        }
    }

    container.appendChild(svg);
}

// 7. Matrix Rain
function createRainBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.setAttribute('class', 'matrix-canvas');
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const chars = '01アイウエオカキクケコサシスセソタチツテト'.split('');
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
    }

    function drawMatrix() {
        ctx.fillStyle = 'rgba(0, 10, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 255, 65, 0.8)';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * fontSize, drops[i] * fontSize);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(drawMatrix, 50);
}

// 8. Aurora
function createAuroraBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    for (let i = 0; i < 4; i++) {
        const aurora = document.createElement('div');
        aurora.className = 'aurora-wave';
        aurora.style.animationDuration = (8 + i * 2) + 's';
        aurora.style.animationDelay = (i * 1.5) + 's';
        aurora.style.top = (20 + i * 15) + '%';
        container.appendChild(aurora);
    }
}

// 9. Geometric Triangles
function createTrianglesBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    for (let i = 0; i < 15; i++) {
        const triangle = document.createElement('div');
        triangle.className = 'geo-triangle';
        triangle.style.left = Math.random() * 100 + '%';
        triangle.style.top = Math.random() * 100 + '%';
        triangle.style.animationDuration = (15 + Math.random() * 10) + 's';
        triangle.style.animationDelay = Math.random() * 5 + 's';
        container.appendChild(triangle);
    }
}

// 10. Neural Network
function createNetworkBackground() {
    const container = document.getElementById('bg-container');
    if (!container) return;

    const nodes: { x: number, y: number, vx: number, vy: number, el: HTMLElement }[] = [];

    for (let i = 0; i < 40; i++) {
        const node = document.createElement('div');
        node.className = 'network-node';
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        node.style.left = x + '%';
        node.style.top = y + '%';
        container.appendChild(node);
        nodes.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 0.1,
            vy: (Math.random() - 0.5) * 0.1,
            el: node
        });
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.setAttribute('class', 'network-svg');
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    container.appendChild(svg);

    function animateNetwork() {
        svg.innerHTML = '';

        nodes.forEach(node => {
            node.x += node.vx;
            node.y += node.vy;

            if (node.x < 0 || node.x > 100) node.vx *= -1;
            if (node.y < 0 || node.y > 100) node.vy *= -1;

            node.el.style.left = node.x + '%';
            node.el.style.top = node.y + '%';
        });

        for (let i = 0; i < nodes.length; i++) {
            let connections = 0;
            for (let j = i + 1; j < nodes.length; j++) {
                if (connections >= 3) break;
                const dist = Math.sqrt(Math.pow(nodes[i].x - nodes[j].x, 2) + Math.pow(nodes[i].y - nodes[j].y, 2));
                if (dist < 20) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', nodes[i].x + '%');
                    line.setAttribute('y1', nodes[i].y + '%');
                    line.setAttribute('x2', nodes[j].x + '%');
                    line.setAttribute('y2', nodes[j].y + '%');
                    line.setAttribute('stroke', 'rgba(0, 242, 234, 0.2)');
                    line.setAttribute('stroke-width', '1');
                    svg.appendChild(line);
                    connections++;
                }
            }
        }

        requestAnimationFrame(animateNetwork);
    }
    animateNetwork();
}
