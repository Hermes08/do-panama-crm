"use client";

import { useState } from "react";
import { FileText, Download, Upload, Loader2, CheckCircle, XCircle, Image as ImageIcon } from "lucide-react";
import { translatePropertyData } from "@/lib/translator";
import { generatePropertyPDF } from "@/lib/pdfGenerator";

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

interface PropertyPDFGeneratorProps {
    lang: 'es' | 'en';
}

export default function PropertyPDFGenerator({ lang }: PropertyPDFGeneratorProps) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
    const [translatedData, setTranslatedData] = useState<PropertyData | null>(null);
    const [customImages, setCustomImages] = useState<string[]>([]);
    const [error, setError] = useState("");
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

    const t = lang === 'es' ? {
        title: "Generador de PDFs de Propiedades",
        subtitle: "Extrae datos de propiedades y crea presentaciones profesionales",
        urlPlaceholder: "Pega el link de la propiedad (MLS, Encuentra24, James Edition)",
        extractBtn: "Extraer Datos",
        translateBtn: "Traducir al Inglés",
        generateBtn: "Generar PDF",
        downloadBtn: "Descargar PDF",
        uploadImages: "Subir Imágenes Personalizadas",
        originalData: "Datos Originales",
        translatedData: "Datos Traducidos",
        price: "Precio",
        location: "Ubicación",
        bedrooms: "Habitaciones",
        bathrooms: "Baños",
        area: "Área",
        description: "Descripción",
        features: "Características",
        images: "Imágenes",
    } : {
        title: "Property PDF Generator",
        subtitle: "Extract property data and create professional presentations",
        urlPlaceholder: "Paste property link (MLS, Encuentra24, James Edition)",
        extractBtn: "Extract Data",
        translateBtn: "Translate to English",
        generateBtn: "Generate PDF",
        downloadBtn: "Download PDF",
        uploadImages: "Upload Custom Images",
        originalData: "Original Data",
        translatedData: "Translated Data",
        price: "Price",
        location: "Location",
        bedrooms: "Bedrooms",
        bathrooms: "Bathrooms",
        area: "Area",
        description: "Description",
        features: "Features",
        images: "Images",
    };

    const handleExtract = async () => {
        setLoading(true);
        setError("");
        setPropertyData(null);
        setTranslatedData(null);
        setPdfBlob(null);

        try {
            const response = await fetch("/.netlify/functions/scrape-property", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to extract property data");
            }

            const data = await response.json();
            setPropertyData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleTranslate = async () => {
        if (!propertyData) return;

        setTranslating(true);
        try {
            const translated = await translatePropertyData(propertyData);
            setTranslatedData(translated);
        } catch (err) {
            setError("Translation failed");
        } finally {
            setTranslating(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const readers = Array.from(files).map((file) => {
            return new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsDataURL(file);
            });
        });

        Promise.all(readers).then((images) => {
            setCustomImages((prev) => [...prev, ...images]);
        });
    };

    const handleGeneratePDF = async () => {
        const dataToUse = translatedData || propertyData;
        if (!dataToUse) return;

        setLoading(true);
        try {
            const blob = await generatePropertyPDF(dataToUse, customImages);
            setPdfBlob(blob);
        } catch (err) {
            setError("PDF generation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!pdfBlob) return;

        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `property_${Date.now()}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">{t.title}</h2>
                <p className="text-white/60">{t.subtitle}</p>
            </div>

            {/* URL Input */}
            <div className="glass-card p-6">
                <div className="flex gap-3">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder={t.urlPlaceholder}
                        className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-gleec-cyan"
                    />
                    <button
                        onClick={handleExtract}
                        disabled={loading || !url}
                        className="glass-btn px-6 py-3 bg-gleec-cyan/20 text-gleec-cyan border-gleec-cyan/50 hover:bg-gleec-cyan hover:text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                        {t.extractBtn}
                    </button>
                </div>

                {error && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-300">
                        <XCircle className="w-5 h-5" />
                        {error}
                    </div>
                )}
            </div>

            {/* Property Data Preview */}
            {propertyData && (
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                            {t.originalData}
                        </h3>
                        <button
                            onClick={handleTranslate}
                            disabled={translating}
                            className="glass-btn px-4 py-2 bg-gleec-purple/20 text-gleec-purple border-gleec-purple/50 hover:bg-gleec-purple hover:text-white"
                        >
                            {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : t.translateBtn}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-white/50">{t.price}</p>
                            <p className="text-brand-gold font-bold text-lg">{propertyData.price}</p>
                        </div>
                        <div>
                            <p className="text-white/50">{t.location}</p>
                            <p className="text-white">{propertyData.location}</p>
                        </div>
                        {propertyData.bedrooms && (
                            <div>
                                <p className="text-white/50">{t.bedrooms}</p>
                                <p className="text-white">{propertyData.bedrooms}</p>
                            </div>
                        )}
                        {propertyData.bathrooms && (
                            <div>
                                <p className="text-white/50">{t.bathrooms}</p>
                                <p className="text-white">{propertyData.bathrooms}</p>
                            </div>
                        )}
                    </div>

                    <div>
                        <p className="text-white/50 mb-2">{t.description}</p>
                        <p className="text-white/80 text-sm line-clamp-3">{propertyData.description}</p>
                    </div>

                    <div>
                        <p className="text-white/50 mb-2">{t.features} ({propertyData.features.length})</p>
                        <div className="flex flex-wrap gap-2">
                            {propertyData.features.slice(0, 6).map((feature, i) => (
                                <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/70">
                                    {feature}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-white/50 mb-2">{t.images} ({propertyData.images.length})</p>
                        <div className="grid grid-cols-4 gap-2">
                            {propertyData.images.slice(0, 4).map((img, i) => (
                                <img key={i} src={img} alt={`Property ${i + 1}`} className="w-full h-20 object-cover rounded-lg" />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Translated Data */}
            {translatedData && (
                <div className="glass-card p-6 space-y-4 border-2 border-gleec-cyan/30">
                    <h3 className="text-xl font-bold text-gleec-cyan">{t.translatedData}</h3>
                    <div>
                        <p className="text-white/50 mb-2">{t.description}</p>
                        <p className="text-white/80 text-sm">{translatedData.description}</p>
                    </div>
                </div>
            )}

            {/* Custom Images Upload */}
            {propertyData && (
                <div className="glass-card p-6">
                    <label className="block">
                        <div className="flex items-center gap-2 mb-3 text-white">
                            <ImageIcon className="w-5 h-5" />
                            <span className="font-semibold">{t.uploadImages}</span>
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-white/70 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gleec-cyan/20 file:text-gleec-cyan hover:file:bg-gleec-cyan hover:file:text-black"
                        />
                    </label>
                    {customImages.length > 0 && (
                        <div className="mt-4 grid grid-cols-4 gap-2">
                            {customImages.map((img, i) => (
                                <img key={i} src={img} alt={`Custom ${i + 1}`} className="w-full h-20 object-cover rounded-lg border-2 border-gleec-cyan/50" />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Generate & Download */}
            {propertyData && (
                <div className="flex gap-4">
                    <button
                        onClick={handleGeneratePDF}
                        disabled={loading}
                        className="flex-1 glass-btn px-6 py-4 bg-brand-gold/20 text-brand-gold border-brand-gold/50 hover:bg-brand-gold hover:text-black font-bold text-lg disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : t.generateBtn}
                    </button>
                    {pdfBlob && (
                        <button
                            onClick={handleDownload}
                            className="flex-1 glass-btn px-6 py-4 bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500 hover:text-white font-bold text-lg flex items-center justify-center gap-2"
                        >
                            <Download className="w-5 h-5" />
                            {t.downloadBtn}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
