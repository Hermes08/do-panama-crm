// Background theme configurations
export const backgroundThemes = {
    // 1. Futuristic City Horizon (Default)
    cityHorizon: {
        name: "City Horizon",
        gradient: "linear-gradient(180deg, #000000 0%, #0a0a14 40%, #1a1a2e 70%, #2d1b3d 100%)",
        particles: {
            colors: ["rgba(0, 242, 234, 0.4)", "rgba(125, 0, 255, 0.3)"],
            count: 30,
            glow: "0 0 8px rgba(0, 242, 234, 0.4)",
        },
        buildings: true, // Show city skyline
        blurs: [
            { color: "rgba(0, 242, 234, 0.15)", position: { top: "60%", left: "20%" } },
            { color: "rgba(125, 0, 255, 0.15)", position: { top: "70%", right: "15%" } },
        ],
        grid: { color: "rgba(0, 242, 234, 0.03)", size: "80px" },
    },

    // 2. Deep Dark (Minimal)
    deepDark: {
        name: "Deep Dark",
        gradient: "linear-gradient(135deg, #000000 0%, #0a0a0a 100%)",
        particles: {
            colors: ["rgba(255, 255, 255, 0.1)"],
            count: 15,
            glow: "0 0 4px rgba(255, 255, 255, 0.2)",
        },
        buildings: false,
        blurs: [
            { color: "rgba(50, 50, 50, 0.2)", position: { top: "30%", left: "50%" } },
        ],
        grid: { color: "rgba(255, 255, 255, 0.02)", size: "100px" },
    },

    // 3. Neon Purple
    neonPurple: {
        name: "Neon Purple",
        gradient: "linear-gradient(135deg, #0a0014 0%, #1a0a28 50%, #2d1b3d 100%)",
        particles: {
            colors: ["rgba(147, 51, 234, 0.6)", "rgba(236, 72, 153, 0.4)"],
            count: 40,
            glow: "0 0 12px rgba(147, 51, 234, 0.6)",
        },
        buildings: false,
        blurs: [
            { color: "rgba(147, 51, 234, 0.3)", position: { top: "20%", left: "10%" } },
            { color: "rgba(236, 72, 153, 0.25)", position: { bottom: "20%", right: "10%" } },
        ],
        grid: { color: "rgba(147, 51, 234, 0.05)", size: "60px" },
    },

    // 4. Ocean Deep
    oceanDeep: {
        name: "Ocean Deep",
        gradient: "linear-gradient(180deg, #001a1a 0%, #002828 50%, #003d3d 100%)",
        particles: {
            colors: ["rgba(0, 200, 255, 0.5)", "rgba(0, 255, 200, 0.3)"],
            count: 35,
            glow: "0 0 10px rgba(0, 200, 255, 0.5)",
        },
        buildings: false,
        blurs: [
            { color: "rgba(0, 200, 255, 0.2)", position: { top: "25%", right: "20%" } },
            { color: "rgba(0, 255, 200, 0.15)", position: { bottom: "30%", left: "25%" } },
        ],
        grid: { color: "rgba(0, 200, 255, 0.04)", size: "70px" },
    },

    // 5. Crimson Night
    crimsonNight: {
        name: "Crimson Night",
        gradient: "linear-gradient(135deg, #1a0000 0%, #2d0a0a 50%, #3d1414 100%)",
        particles: {
            colors: ["rgba(255, 107, 107, 0.6)", "rgba(255, 193, 7, 0.4)"],
            count: 45,
            glow: "0 0 15px rgba(255, 107, 107, 0.5)",
        },
        buildings: false,
        blurs: [
            { color: "rgba(255, 107, 107, 0.25)", position: { top: "15%", left: "15%" } },
            { color: "rgba(255, 193, 7, 0.2)", position: { bottom: "25%", right: "20%" } },
        ],
        grid: { color: "rgba(255, 107, 107, 0.05)", size: "50px" },
    },

    // 6. Matrix Green
    matrixGreen: {
        name: "Matrix Green",
        gradient: "linear-gradient(180deg, #000a00 0%, #001400 50%, #001a00 100%)",
        particles: {
            colors: ["rgba(0, 255, 65, 0.5)", "rgba(0, 200, 50, 0.3)"],
            count: 50,
            glow: "0 0 8px rgba(0, 255, 65, 0.6)",
        },
        buildings: false,
        blurs: [
            { color: "rgba(0, 255, 65, 0.15)", position: { top: "35%", left: "30%" } },
            { color: "rgba(0, 200, 50, 0.12)", position: { bottom: "40%", right: "35%" } },
        ],
        grid: { color: "rgba(0, 255, 65, 0.06)", size: "40px" },
    },

    // 7. Sunset Gradient
    sunsetGradient: {
        name: "Sunset Gradient",
        gradient: "linear-gradient(180deg, #0a0014 0%, #1a0a28 30%, #2d1428 60%, #3d1a1a 100%)",
        particles: {
            colors: ["rgba(255, 107, 107, 0.4)", "rgba(255, 193, 7, 0.3)", "rgba(147, 51, 234, 0.3)"],
            count: 40,
            glow: "0 0 10px rgba(255, 107, 107, 0.4)",
        },
        buildings: true,
        blurs: [
            { color: "rgba(255, 107, 107, 0.2)", position: { top: "50%", left: "10%" } },
            { color: "rgba(147, 51, 234, 0.18)", position: { top: "60%", right: "15%" } },
            { color: "rgba(255, 193, 7, 0.15)", position: { bottom: "20%", left: "50%" } },
        ],
        grid: { color: "rgba(255, 107, 107, 0.04)", size: "65px" },
    },

    // 8. Arctic Blue
    arcticBlue: {
        name: "Arctic Blue",
        gradient: "linear-gradient(135deg, #000a14 0%, #001428 50%, #00283d 100%)",
        particles: {
            colors: ["rgba(100, 200, 255, 0.5)", "rgba(200, 230, 255, 0.3)"],
            count: 25,
            glow: "0 0 6px rgba(100, 200, 255, 0.5)",
        },
        buildings: false,
        blurs: [
            { color: "rgba(100, 200, 255, 0.2)", position: { top: "20%", right: "25%" } },
            { color: "rgba(200, 230, 255, 0.15)", position: { bottom: "30%", left: "20%" } },
        ],
        grid: { color: "rgba(100, 200, 255, 0.03)", size: "90px" },
    },

    // 9. Gold Luxury
    goldLuxury: {
        name: "Gold Luxury",
        gradient: "linear-gradient(135deg, #0a0a00 0%, #1a1400 50%, #2d2314 100%)",
        particles: {
            colors: ["rgba(212, 175, 55, 0.6)", "rgba(255, 215, 0, 0.4)"],
            count: 30,
            glow: "0 0 12px rgba(212, 175, 55, 0.5)",
        },
        buildings: false,
        blurs: [
            { color: "rgba(212, 175, 55, 0.2)", position: { top: "25%", left: "20%" } },
            { color: "rgba(255, 215, 0, 0.15)", position: { bottom: "35%", right: "25%" } },
        ],
        grid: { color: "rgba(212, 175, 55, 0.04)", size: "75px" },
    },

    // 10. Midnight Teal
    midnightTeal: {
        name: "Midnight Teal",
        gradient: "linear-gradient(180deg, #000a0a 0%, #00141a 40%, #001a28 70%, #002838 100%)",
        particles: {
            colors: ["rgba(0, 242, 234, 0.5)", "rgba(0, 150, 200, 0.3)"],
            count: 35,
            glow: "0 0 10px rgba(0, 242, 234, 0.4)",
        },
        buildings: true,
        blurs: [
            { color: "rgba(0, 242, 234, 0.18)", position: { top: "40%", left: "15%" } },
            { color: "rgba(0, 150, 200, 0.15)", position: { bottom: "25%", right: "20%" } },
        ],
        grid: { color: "rgba(0, 242, 234, 0.04)", size: "70px" },
    },
};

export type BackgroundTheme = keyof typeof backgroundThemes;
