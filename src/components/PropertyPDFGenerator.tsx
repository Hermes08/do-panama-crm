"use client";

import { useState } from "react";
import { FileText, Download, Loader2, CheckCircle, XCircle, Image as ImageIcon, Video, Sparkles, Zap, ExternalLink, Edit2 } from "lucide-react";
import { translatePropertyData } from "@/lib/translator";
import { generatePropertyPDF } from "@/lib/pdfGenerator";
import { generatePropertyVideo } from "@/lib/videoGenerator";
import PropertyDataEditor from "@/components/PropertyDataEditor";
import ImageManager from "@/components/ImageManager";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import { generateSlug } from "@/lib/slugify";

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
    debugLog?: string[];
}

interface PropertyPDFGeneratorProps {
    lang: 'es' | 'en';
}

export default function PropertyPDFGenerator({ lang }: PropertyPDFGeneratorProps) {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [translating, setTranslating] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [videoProgress, setVideoProgress] = useState(0);

    const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
    const [translatedData, setTranslatedData] = useState<PropertyData | null>(null);
    const [customImages, setCustomImages] = useState<string[]>([]);

    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [error, setError] = useState("");
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);

    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const [showVideoPreview, setShowVideoPreview] = useState(false);
    const [showDataEditor, setShowDataEditor] = useState(false);
    const [showImageManager, setShowImageManager] = useState(false);

    const t = lang === 'es' ? {
        title: "Generador de Presentaciones (PDF & Video)",
        subtitle: "Extrae datos y crea presentaciones profesionales en PDF o Video",
        urlPlaceholder: "Pega el link de la propiedad (MLS, Encuentra24, James Edition)",
        extractBtn: "Extraer Datos",
        translateBtn: "Traducir al Inglés",
        generateBtn: "Generar PDF",
        generateVideoBtn: "Generar Video",
        downloadBtn: "Descargar PDF",
        downloadVideoBtn: "Descargar Video",
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
        generatingVideo: "Generando Video...",
    } : {
        title: "Property Presentation Generator (PDF & Video)",
        subtitle: "Extract data and create professional PDF or Video presentations",
        urlPlaceholder: "Paste property link (MLS, Encuentra24, James Edition)",
        extractBtn: "Extract Data",
        translateBtn: "Translate to English",
        generateBtn: "Generate PDF",
        generateVideoBtn: "Generate Video",
        downloadBtn: "Download PDF",
        downloadVideoBtn: "Download Video",
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
        generatingVideo: "Generating Video...",
    };

    const handleExtract = async () => {
        setLoading(true);
        setError("");
        setPropertyData(null);
        setTranslatedData(null);
        setPdfBlob(null);
        setVideoBlob(null);

        try {
            // 1. Generate Request ID
            const requestId = crypto.randomUUID();

            // 2. Create Initial Record in Supabase
            const { error: dbError } = await supabase
                .from('scraped_results')
                .insert({
                    id: requestId,
                    url: url,
                    status: 'pending'
                });

            if (dbError) throw new Error("Failed to initialize scrape job: " + dbError.message);

            // 3. Trigger Background Function
            // Note: Background functions return 202 immediately.
            const response = await fetch("/.netlify/functions/scrape-background", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requestId, url }),
            });

            if (response.status !== 202) {
                // Even if it fails, it might return 200/500, but background functions specifically should be 202.
                // However, let's treat any success-like code as fine for now, but 202 is the standard.
                // If it's an error, throw.
                if (!response.ok) {
                    throw new Error("Failed to start background scrape");
                }
            }

            // 4. Poll for Results
            let attempts = 0;
            const maxAttempts = 60; // 2 minutes (assuming 2s interval)

            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const { data: job, error: pollError } = await supabase
                        .from('scraped_results')
                        .select('*')
                        .eq('id', requestId)
                        .single();

                    if (pollError) {
                        console.error("Polling error:", pollError);
                        return;
                    }

                    if (job.status === 'completed') {
                        clearInterval(pollInterval);
                        const resultData = job.data;
                        setPropertyData(resultData);
                        setLoading(false);

                        // Auto-translate
                        setTranslating(true);
                        try {
                            const translated = await translatePropertyData(resultData);
                            setTranslatedData(translated);
                        } catch (err) {
                            console.error("Auto-translation failed:", err);
                        } finally {
                            setTranslating(false);
                        }
                    } else if (job.status === 'failed') {
                        clearInterval(pollInterval);
                        setError(job.error || "Scrape job failed");
                        setLoading(false);
                    } else if (attempts >= maxAttempts) {
                        clearInterval(pollInterval);
                        setError("Scrape operation timed out after 2 minutes.");
                        setLoading(false);
                    }
                } catch (e) {
                    console.error("Polling exception", e);
                }
            }, 2000);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error occurred");
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
            setShowPdfPreview(true); // Show preview modal
        } catch (err) {
            console.error(err);
            setError("PDF generation failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateVideo = async () => {
        const dataToUse = translatedData || propertyData;
        if (!dataToUse) return;

        setGeneratingVideo(true);
        setVideoProgress(0);
        setError("");

        try {
            // Pass the progress callback
            const blob = await generatePropertyVideo(dataToUse, customImages, (progress) => {
                setVideoProgress(Math.round(progress * 100));
            });
            setVideoBlob(blob);
            setShowVideoPreview(true);
        } catch (err) {
            console.error(err);
            setError("Video generation failed: " + (err instanceof Error ? err.message : "Unknown error"));
        } finally {
            setGeneratingVideo(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!pdfBlob) return;

        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `property_${Date.now()}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadVideo = () => {
        if (!videoBlob) return;

        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `property_video_${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleViewPresentation = async () => {
        const dataToUse = translatedData || propertyData;
        if (!dataToUse) return;

        try {
            setLoading(true);

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            const slug = generateSlug(dataToUse.title);

            const { error } = await supabase
                .from('property_presentations')
                .insert({
                    user_id: user?.id,
                    title: dataToUse.title,
                    slug: slug,
                    data: {
                        ...dataToUse,
                        images: customImages.length > 0 ? customImages : dataToUse.images
                    },
                    is_public: true
                });

            if (error) throw error;

            // Redirect to new page
            router.push(`/p/${slug}`);

        } catch (err: any) {
            console.error('Error creating presentation:', err);
            setError('Failed to create presentation: ' + err.message);
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white mb-2">{t.title}</h2>
                <p className="text-white/60">{t.subtitle}</p>
            </div>

            {/* URL Input */}
            <div className="glass-card p-4 md:p-6">
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
                        className="glass-btn bg-gleec-cyan/20 text-gleec-cyan border-gleec-cyan/50 hover:bg-gleec-cyan hover:text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

            {/* Feature Showcase / Empty State */}
            {!propertyData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-6 border border-white/5 hover:border-brand-gold/30 transition-colors group bg-brand-gold/5">
                        <div className="w-12 h-12 bg-brand-gold/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-6 h-6 text-brand-gold" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Web Presentation</h3>
                        <p className="text-white/60 text-sm">
                            Premium digital brochure with perfect character encoding (ñ, á, m²) and responsive mobile design.
                        </p>
                    </div>

                    <div className="glass-card p-6 border border-white/5 hover:border-blue-500/30 transition-colors group bg-blue-500/5">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileText className="w-6 h-6 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Professional PDF</h3>
                        <p className="text-white/60 text-sm">
                            Generate classic PDF dossiers with the "Sky & Slate" design. Perfect for offline sharing.
                        </p>
                    </div>

                    <div className="glass-card p-6 border border-white/5 hover:border-purple-500/30 transition-colors group bg-purple-500/5">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Video className="w-6 h-6 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Video Reels</h3>
                        <p className="text-white/60 text-sm">
                            Create engaging 60s video slideshows with music and transitions for WhatsApp and Social Media.
                        </p>
                    </div>

                    {/* Quick Test Button */}
                    <div className="col-span-1 md:col-span-2 text-center">
                        <button
                            onClick={() => {
                                setPropertyData({
                                    title: "Luxury Ocean View Penthouse",
                                    price: "$1,250,000",
                                    location: "Punta Pacifica, Panama City",
                                    bedrooms: "4",
                                    bathrooms: "4.5",
                                    area: "350 m²",
                                    description: "Experience the pinnacle of luxury living in this stunning penthouse. Featuring panoramic ocean views, marble floors, and top-of-the-line appliances.",
                                    features: ["Ocean View", "Pool", "Gym", "Concierge", "24/7 Security", "Smart Home"],
                                    images: [
                                        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80",
                                        "https://images.unsplash.com/photo-1600596542815-e495d915993a?auto=format&fit=crop&w=1000&q=80",
                                        "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1000&q=80",
                                        "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1000&q=80"
                                    ],
                                    source: "demo",
                                    debugLog: ["Sample log 1", "Sample log 2: Something happened", "Sample log 3: Another event"]
                                    // @ts-ignore
                                });
                            }}
                            className="text-white/30 text-xs hover:text-white underline"
                        >
                            Load Sample Data (Test UI)
                        </button>
                    </div>
                </div>
            )}

            {/* Property Data Preview */}
            {propertyData && (
                <div className="glass-card p-4 md:p-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                            {t.originalData}
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowDataEditor(true)}
                                className="glass-btn px-4 py-2 bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white flex items-center gap-2"
                            >
                                <Edit2 className="w-4 h-4" />
                                Edit Data
                            </button>
                            <button
                                onClick={() => setShowImageManager(true)}
                                className="glass-btn px-4 py-2 bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500 hover:text-white flex items-center gap-2"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Manage Images ({propertyData.images?.length || 0})
                            </button>
                        </div>
                    </div>

                    {/* Debug Log Section */}
                    {propertyData.debugLog && propertyData.debugLog.length > 0 && (
                        <div className="mb-4">
                            <details className="glass-card bg-black/20 border border-yellow-500/30">
                                <summary className="p-3 cursor-pointer text-yellow-500 font-mono text-xs flex items-center gap-2 hover:bg-white/5 transition-colors">
                                    <Sparkles className="w-4 h-4" />
                                    Show Extraction Debug Logs ({propertyData.debugLog.length} lines)
                                </summary>
                                <div className="p-3 max-h-60 overflow-y-auto font-mono text-xs text-white/70 bg-black/40 space-y-1">
                                    {propertyData.debugLog.map((log, i) => (
                                        <div key={i} className="border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </details>
                        </div>
                    )}

                    <button
                        onClick={handleTranslate}
                        disabled={translating}
                        className="glass-btn px-4 py-2 bg-gleec-purple/20 text-gleec-purple border-gleec-purple/50 hover:bg-gleec-purple hover:text-white"
                    >
                        {translating ? <Loader2 className="w-4 h-4 animate-spin" /> : t.translateBtn}
                    </button>

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
            {
                translatedData && (
                    <div className="glass-card p-6 space-y-4 border-2 border-gleec-cyan/30">
                        <h3 className="text-xl font-bold text-gleec-cyan">{t.translatedData}</h3>
                        <div>
                            <p className="text-white/50 mb-2">{t.description}</p>
                            <p className="text-white/80 text-sm">{translatedData.description}</p>
                        </div>
                    </div>
                )
            }

            {/* Custom Images Upload */}
            {
                propertyData && (
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
                )
            }

            {/* Generate Actions */}
            {
                propertyData && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/10 pt-8">
                        {/* WEB VIEW Action - PRIMARY */}
                        <button
                            onClick={handleViewPresentation}
                            className="col-span-full glass-btn bg-brand-gold text-brand-navy border-brand-gold hover:bg-white font-bold text-xl flex items-center justify-center gap-3 py-6 shadow-[0_0_30px_rgba(234,179,8,0.2)] hover:scale-[1.01] transition-all"
                        >
                            <Sparkles className="w-7 h-7" />
                            {lang === 'es' ? 'VER PRESENTACIÓN WEB (PREMIUM)' : 'VIEW WEB PRESENTATION (PREMIUM)'}
                        </button>

                        {/* PDF Action */}
                        <button
                            onClick={handleGeneratePDF}
                            disabled={loading || generatingVideo}
                            className="glass-btn bg-blue-500/20 text-blue-400 border-blue-500/50 hover:bg-blue-500 hover:text-white font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 py-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                            {t.generateBtn}
                        </button>

                        {/* Video Action */}
                        <button
                            onClick={handleGenerateVideo}
                            disabled={loading || generatingVideo}
                            className="glass-btn bg-purple-500/20 text-purple-400 border-purple-500/50 hover:bg-purple-500 hover:text-white font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 py-4"
                        >
                            {generatingVideo ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span className="text-sm ml-2">
                                        {videoProgress}%
                                    </span>
                                </>
                            ) : (
                                <>
                                    <Video className="w-5 h-5" />
                                    {t.generateVideoBtn}
                                </>
                            )}
                        </button>

                        {/* Persistence Action (Placeholder for now) */}
                        <button
                            className="glass-btn bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 font-bold text-lg flex items-center justify-center gap-2 py-4"
                            onClick={() => alert(lang === 'es' ? 'Próximamente: Guardar enlace permanente' : 'Coming soon: Save permanent link')}
                        >
                            <ExternalLink className="w-5 h-5" />
                            {lang === 'es' ? 'Guardar Enlace' : 'Save Link'}
                        </button>

                        {pdfBlob && (
                            <button
                                onClick={handleDownloadPDF}
                                className="col-span-full md:col-span-1 glass-btn bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500 hover:text-white font-bold text-lg flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                {t.downloadBtn}
                            </button>
                        )}

                        {videoBlob && (
                            <button
                                onClick={handleDownloadVideo}
                                className="col-span-full md:col-span-1 glass-btn bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500 hover:text-white font-bold text-lg flex items-center justify-center gap-2"
                            >
                                <Download className="w-5 h-5" />
                                {t.downloadVideoBtn}
                            </button>
                        )}
                    </div>
                )
            }

            {/* PDF Preview Modal */}
            {
                showPdfPreview && pdfBlob && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="glass-card p-6 w-full max-w-4xl h-[90vh] flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">PDF Preview</h3>
                                <button
                                    onClick={() => setShowPdfPreview(false)}
                                    className="text-white/70 hover:text-white"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 bg-black/50 rounded-lg overflow-hidden mb-4">
                                <iframe
                                    src={URL.createObjectURL(pdfBlob)}
                                    className="w-full h-full"
                                    title="PDF Preview"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowPdfPreview(false)}
                                    className="flex-1 glass-btn bg-white/10 text-white border-white/20 hover:bg-white/20"
                                >
                                    Close Preview
                                </button>
                                <button
                                    onClick={() => {
                                        handleDownloadPDF();
                                        setShowPdfPreview(false);
                                    }}
                                    className="flex-1 glass-btn bg-green-500/20 text-green-400 border-green-500/50 hover:bg-green-500 hover:text-white font-bold flex items-center justify-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    {t.downloadBtn}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Video Preview Modal */}
            {
                showVideoPreview && videoBlob && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="glass-card p-6 w-full max-w-4xl flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">Video Preview</h3>
                                <button
                                    onClick={() => setShowVideoPreview(false)}
                                    className="text-white/70 hover:text-white"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 border border-white/10 relative group">
                                <video
                                    src={URL.createObjectURL(videoBlob)}
                                    controls
                                    className="w-full h-full"
                                    autoPlay
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowVideoPreview(false)}
                                    className="flex-1 glass-btn bg-white/10 text-white border-white/20 hover:bg-white/20"
                                >
                                    Close Preview
                                </button>
                                <button
                                    onClick={() => {
                                        handleDownloadVideo();
                                        setShowVideoPreview(false);
                                    }}
                                    className="flex-1 glass-btn bg-gleec-purple/20 text-gleec-purple border-gleec-purple/50 hover:bg-gleec-purple hover:text-white font-bold flex items-center justify-center gap-2"
                                >
                                    <Download className="w-5 h-5" />
                                    {t.downloadVideoBtn}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
