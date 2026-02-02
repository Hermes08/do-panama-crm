import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand-navy': '#0a192f',
                'brand-gold': '#d4af37',
                'brand-light': '#f8f9fa',
                'gleec': {
                    cyan: '#00f2ea',
                    purple: '#7d00ff',
                    dark: '#050505',
                    card: '#121212'
                }
            },
        },
    },
    plugins: [],
};
export default config;