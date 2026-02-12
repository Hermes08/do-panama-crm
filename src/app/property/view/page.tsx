"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bed, Bath, Maximize, MapPin, Printer, ArrowLeft, Download, Share2 } from "lucide-react";

interface PropertyData {
    title: string;
    price: string;
    location: string;
    bedrooms?: string;
    bathrooms?: string;
    area?: string;
    description: string;
    features: string[];
    images: string[];
    source: string;
}

export default function PropertyViewPage() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<PropertyData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Try to load data from localStorage (passed from PropertyPDFGenerator)
        const storedData = localStorage.getItem("temp_property_data");
        if (storedData) {
            setData(JSON.parse(storedData));
            setLoading(false);
        } else {
            // Fallback to URL params (less detailed)
            const title = searchParams.get("title") || "Property Presentation";
            const price = searchParams.get("price") || "Contact for Price";
            setData({
                title,
                price,
                location: searchParams.get("location") || "Panama",
                description: "Property details not found. Please try generating from the dashboard.",
                features: [],
                images: [],
                source: "DO Panama"
            });
            setLoading(false);
        }
    }, [searchParams]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-brand-navy flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-brand-gold"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="min-h-screen bg-brand-navy text-white font-sans selection:bg-brand-gold selection:text-brand-navy print:bg-white print:text-black">
            {/* Control Bar - Hidden during print */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-brand-navy/80 backdrop-blur-md z-50 flex items-center justify-between px-6 border-b border-white/10 print:hidden">
                <button onClick={() => window.close()} className="flex items-center gap-2 text-white/70 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to CRM
                </button>
                <div className="flex items-center gap-4">
                    <button onClick={handlePrint} className="glass-btn px-4 py-2 flex items-center gap-2 bg-brand-gold/10 text-brand-gold border-brand-gold/30 hover:bg-brand-gold hover:text-brand-navy transition-all">
                        <Printer className="w-4 h-4" /> Print PDF
                    </button>
                </div>
            </div>

            {/* Content Container */}
            <main className="pt-16 max-w-5xl mx-auto p-6 md:p-12 space-y-12 pb-24">

                {/* Hero Section */}
                <section className="space-y-6">
                    <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl group">
                        {data.images[0] ? (
                            <img src={data.images[0]} alt={data.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
                        ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-white/20">No Hero Image</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-8 left-8 right-8">
                            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-2 leading-tight uppercase font-heading">{data.title}</h1>
                            <div className="flex items-center gap-2 text-brand-gold text-xl md:text-2xl font-bold">
                                <MapPin className="w-5 h-5" /> {data.location}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Price & Primary Specs */}
                <section className="grid md:grid-cols-2 gap-8 items-center bg-white/5 p-8 rounded-3xl border border-white/10 glass-card">
                    <div>
                        <p className="text-brand-gold/60 uppercase tracking-widest text-sm font-bold mb-1">Investment Price</p>
                        <h2 className="text-4xl md:text-6xl font-bold text-brand-gold">{data.price}</h2>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col items-center text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                            <Bed className="w-6 h-6 text-brand-gold mb-2" />
                            <span className="text-lg font-bold">{data.bedrooms || "-"}</span>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Beds</span>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                            <Bath className="w-6 h-6 text-brand-gold mb-2" />
                            <span className="text-lg font-bold">{data.bathrooms || "-"}</span>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Baths</span>
                        </div>
                        <div className="flex flex-col items-center text-center p-4 bg-white/5 rounded-2xl border border-white/5">
                            <Maximize className="w-6 h-6 text-brand-gold mb-2" />
                            <span className="text-lg font-bold">{data.area || "-"}</span>
                            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Area</span>
                        </div>
                    </div>
                </section>

                {/* Description */}
                <section className="grid lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="text-2xl font-bold font-heading border-l-4 border-brand-gold pl-4 uppercase tracking-wider">Description</h3>
                        <p className="text-lg leading-relaxed text-brand-light/90 whitespace-pre-wrap font-light">
                            {data.description}
                        </p>
                    </div>
                    <div className="space-y-6">
                        <h3 className="text-2xl font-bold font-heading border-l-4 border-brand-gold pl-4 uppercase tracking-wider">Amenities</h3>
                        <ul className="grid grid-cols-1 gap-3">
                            {data.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <span className="w-2 h-2 rounded-full bg-brand-gold shadow-[0_0_8px_#EAB308]"></span>
                                    <span className="text-sm text-brand-light font-medium">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Gallery Grid */}
                {data.images.length > 1 && (
                    <section className="space-y-6">
                        <h3 className="text-2xl font-bold font-heading border-l-4 border-brand-gold pl-4 uppercase tracking-wider">Property Gallery</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                            {data.images.slice(1).map((img, i) => (
                                <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group border border-white/10">
                                    <img src={img} alt="Property detail" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-brand-navy/20 group-hover:bg-transparent transition-colors"></div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Footer */}
                <footer className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 text-white/50 text-sm">
                    <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left">
                        <p className="font-bold text-white tracking-widest text-lg">DO PANAMA REAL ESTATE</p>
                        <p>Luxury Real Estate Experts | Panama City</p>
                    </div>
                    <div className="flex gap-8 items-center">
                        <div className="text-right hidden md:block">
                            <p className="text-brand-gold font-bold">Contact Expert</p>
                            <p>+507 6XXX-XXXX</p>
                        </div>
                        <div className="h-12 w-12 bg-white/10 rounded-full flex items-center justify-center text-brand-gold border border-brand-gold/30">
                            DO
                        </div>
                    </div>
                </footer>

            </main>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 1cm;
                    }
                    body {
                        background: white !important;
                        color: black !important;
                    }
                    .glass-card {
                        background: #f8fafc !important;
                        border: 1px solid #e2e8f0 !important;
                        box-shadow: none !important;
                    }
                    img {
                        max-width: 100% !important;
                        page-break-inside: avoid;
                    }
                    h1, h2, h3, h4 {
                        color: #0f172a !important;
                    }
                    .text-brand-gold {
                        color: #b45309 !important;
                    }
                }
            `}</style>
        </div>
    );
}
