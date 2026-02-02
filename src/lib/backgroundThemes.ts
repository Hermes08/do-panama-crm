// Background theme configurations with DIVERSE visual styles
export const backgroundThemes = {
    // 1. Futuristic City Horizon with Buildings
    cityHorizon: {
        name: "City Horizon",
        type: "city",
        gradient: "linear-gradient(180deg, #000000 0%, #0a0a14 40%, #1a1a2e 70%, #2d1b3d 100%)",
        config: {
            buildings: true,
            particles: 30,
            particleColor: "rgba(0, 242, 234, 0.4)",
        }
    },

    // 2. Animated Waves (Ocean-like)
    oceanWaves: {
        name: "Ocean Waves",
        type: "waves",
        gradient: "linear-gradient(180deg, #001a1a 0%, #002828 50%, #003d3d 100%)",
        config: {
            waveCount: 4,
            waveColors: ["rgba(0, 200, 255, 0.1)", "rgba(0, 150, 200, 0.15)", "rgba(0, 242, 234, 0.1)", "rgba(0, 100, 150, 0.2)"],
            speed: [15, 20, 25, 30],
        }
    },

    // 3. Hexagonal Grid Pattern
    hexGrid: {
        name: "Hex Grid",
        type: "hexagons",
        gradient: "linear-gradient(135deg, #0a0014 0%, #1a0a28 50%, #2d1b3d 100%)",
        config: {
            hexSize: 40,
            hexColor: "rgba(147, 51, 234, 0.2)",
            glowColor: "rgba(147, 51, 234, 0.4)",
        }
    },

    // 4. Circuit Board / Tech Lines
    circuitBoard: {
        name: "Circuit Board",
        type: "circuit",
        gradient: "linear-gradient(135deg, #000a00 0%, #001400 50%, #001a00 100%)",
        config: {
            lineCount: 20,
            lineColor: "rgba(0, 255, 65, 0.3)",
            nodeColor: "rgba(0, 255, 65, 0.6)",
            pulseSpeed: 3,
        }
    },

    // 5. DNA Helix / Double Spiral
    dnaHelix: {
        name: "DNA Helix",
        type: "helix",
        gradient: "linear-gradient(180deg, #0a0a00 0%, #1a1400 50%, #2d2314 100%)",
        config: {
            helixColor1: "rgba(212, 175, 55, 0.4)",
            helixColor2: "rgba(255, 215, 0, 0.3)",
            rotationSpeed: 30,
        }
    },

    // 6. Starfield / Constellation
    constellation: {
        name: "Constellation",
        type: "stars",
        gradient: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
        config: {
            starCount: 100,
            starColor: "rgba(255, 255, 255, 0.8)",
            connectionDistance: 150,
            lineColor: "rgba(100, 200, 255, 0.2)",
        }
    },

    // 7. Digital Rain (Matrix Style)
    matrixRain: {
        name: "Matrix Rain",
        type: "rain",
        gradient: "linear-gradient(180deg, #000a00 0%, #001400 50%, #001a00 100%)",
        config: {
            columnCount: 30,
            rainColor: "rgba(0, 255, 65, 0.8)",
            speed: 2,
            characters: "01アイウエオカキクケコサシスセソタチツテト",
        }
    },

    // 8. Aurora Borealis / Northern Lights
    aurora: {
        name: "Aurora",
        type: "aurora",
        gradient: "linear-gradient(180deg, #000a14 0%, #001428 50%, #00283d 100%)",
        config: {
            colors: [
                "rgba(100, 200, 255, 0.3)",
                "rgba(0, 242, 234, 0.25)",
                "rgba(147, 51, 234, 0.2)",
                "rgba(200, 230, 255, 0.15)"
            ],
            waveSpeed: 8,
        }
    },

    // 9. Geometric Triangles
    geometricTriangles: {
        name: "Geo Triangles",
        type: "triangles",
        gradient: "linear-gradient(135deg, #1a0000 0%, #2d0a0a 50%, #3d1414 100%)",
        config: {
            triangleCount: 15,
            triangleColor: "rgba(255, 107, 107, 0.15)",
            borderColor: "rgba(255, 107, 107, 0.4)",
            rotationSpeed: 20,
        }
    },

    // 10. Neural Network / Connected Nodes
    neuralNetwork: {
        name: "Neural Net",
        type: "network",
        gradient: "linear-gradient(180deg, #000a0a 0%, #00141a 40%, #001a28 70%, #002838 100%)",
        config: {
            nodeCount: 40,
            nodeColor: "rgba(0, 242, 234, 0.6)",
            connectionColor: "rgba(0, 242, 234, 0.2)",
            pulseSpeed: 4,
            maxConnections: 3,
        }
    },
};

export type BackgroundTheme = keyof typeof backgroundThemes;
