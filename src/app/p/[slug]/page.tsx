"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/auth-helpers-nextjs";
import { PropertyPresentation } from "@/types";
import { Edit2, Share2, Download, Eye, EyeOff, Loader2 } from "lucide-react";
import PresentationView from "@/components/PresentationView";

export default function PropertyPresentationPage() {
    const params = useParams();
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [presentation, setPresentation] = useState<PropertyPresentation | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadPresentation();
    }, [params.slug]);

    const loadPresentation = async () => {
        try {
            setLoading(true);
            setError("");

            // Load presentation
            const { data, error: fetchError } = await supabase
                .from('property_presentations')
                .select('*')
                .eq('slug', params.slug)
                .single();

            if (fetchError) throw fetchError;
            if (!data) throw new Error('Presentation not found');

            setPresentation(data);

            // Check if user is owner
            const { data: { user } } = await supabase.auth.getUser();
            setIsOwner(user?.id === data.user_id);

            // Increment view count (only if not owner)
            if (user?.id !== data.user_id) {
                await supabase.rpc('increment_presentation_views', {
                    presentation_slug: params.slug as string
                });
            }

        } catch (err: any) {
            console.error('Error loading presentation:', err);
            setError(err.message || 'Failed to load presentation');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (updatedData: any) => {
        if (!presentation || !isOwner) return;

        try {
            setSaving(true);

            const { error: updateError } = await supabase
                .from('property_presentations')
                .update({ data: updatedData })
                .eq('id', presentation.id);

            if (updateError) throw updateError;

            setPresentation(prev => prev ? { ...prev, data: updatedData } : null);

        } catch (err: any) {
            console.error('Error saving:', err);
            alert('Failed to save changes: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    };

    const togglePublic = async () => {
        if (!presentation || !isOwner) return;

        try {
            const newPublicState = !presentation.is_public;

            const { error: updateError } = await supabase
                .from('property_presentations')
                .update({ is_public: newPublicState })
                .eq('id', presentation.id);

            if (updateError) throw updateError;

            setPresentation(prev => prev ? { ...prev, is_public: newPublicState } : null);

        } catch (err: any) {
            console.error('Error toggling public:', err);
            alert('Failed to update visibility: ' + err.message);
        }
    };

    const exportToPDF = async () => {
        // Import dynamically to avoid SSR issues
        const html2pdf = (await import('html2pdf.js')).default;

        const element = document.getElementById('presentation-content');
        if (!element || !presentation) return;

        const opt = {
            margin: 0,
            filename: `${presentation.data.title}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-navy via-purple-900 to-black">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-brand-gold animate-spin mx-auto mb-4" />
                    <p className="text-white/60">Loading presentation...</p>
                </div>
            </div>
        );
    }

    if (error || !presentation) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-navy via-purple-900 to-black p-4">
                <div className="glass-card p-8 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Presentation Not Found</h1>
                    <p className="text-white/60 mb-6">{error || 'This presentation does not exist or has been removed.'}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="glass-btn bg-brand-gold text-brand-navy border-brand-gold hover:bg-white"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-brand-navy via-purple-900 to-black">
            {/* Edit Toolbar (only for owner) */}
            {isOwner && (
                <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
                    <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isEditing
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-white/10 text-white hover:bg-white/20'
                                    }`}
                            >
                                <Edit2 className="w-4 h-4" />
                                {isEditing ? 'Preview' : 'Edit'}
                            </button>

                            {saving && (
                                <span className="text-white/60 text-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={togglePublic}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                                title={presentation.is_public ? 'Public' : 'Private'}
                            >
                                {presentation.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                {presentation.is_public ? 'Public' : 'Private'}
                            </button>

                            <button
                                onClick={handleShare}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                            >
                                <Share2 className="w-4 h-4" />
                                Share
                            </button>

                            <button
                                onClick={exportToPDF}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-gold text-brand-navy hover:bg-white transition-colors font-semibold"
                            >
                                <Download className="w-4 h-4" />
                                Export PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Presentation Content */}
            <div id="presentation-content">
                <PresentationView
                    data={presentation.data}
                    isEditing={isEditing}
                    onSave={handleSave}
                />
            </div>

            {/* View Counter (bottom right) */}
            <div className="fixed bottom-4 right-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full text-white/60 text-sm">
                <Eye className="w-4 h-4 inline mr-2" />
                {presentation.views} views
            </div>
        </div>
    );
}
