import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import ThreeBackground from "@/components/ThreeBackground";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const montserrat = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
    title: "CRM Inmobiliario Pro",
    description: "High-end Real Estate CRM",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${montserrat.variable} bg-brand-navy text-brand-light font-sans overflow-hidden antialiased`}>
                <div className="fixed inset-0 z-0">
                    <ThreeBackground />
                </div>
                <main className="relative z-10 h-screen overflow-y-auto">
                    {children}
                </main>
            </body>
        </html>
    );
}
