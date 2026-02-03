"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, CheckCircle, Send, User, Mail, Youtube, Linkedin, Play, Lock, Calendar as CalendarIcon, ArrowRight } from "lucide-react";
import Link from 'next/link';

import { BUYER_TYPES } from "@/lib/constants";
import WorldCitizenBackground from "@/components/WorldCitizenBackground";

export default function PublicIntakePage() {
    const [step, setStep] = useState(1); // 1: Info, 2: Calendar

    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        buyer_type: "",
        client_story: "", // New "Who am I" field
    });

    // Calendar Mock State
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleNextStep = () => {
        if (!formData.full_name || !formData.email || !formData.buyer_type) {
            setError("Please fill in all fields and select a buyer type to proceed.");
            return;
        }
        setError("");
        setStep(2);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        setError("");

        try {
            const newId = crypto.randomUUID();
            const clientData = {
                id: newId,
                full_name: formData.full_name,
                email: formData.email,
                tag: 'Web Lead',
                status: 'Prospecto',
                // Store the buyer type in notes or interest category
                interest_category: formData.buyer_type,
                detailed_notes: `[Web Lead] Buyer Type: ${formData.buyer_type}.\n\nClient Story: ${formData.client_story}\n\nBooked: ${selectedDate} at ${selectedTime}`,
                created_at: new Date().toISOString()
            };

            const { error: sbError } = await supabase
                .from('crm_clients')
                .insert([clientData]);

            if (sbError) throw sbError;

            setSubmitted(true);
        } catch (err: any) {
            console.error("Submission error:", err);
            setError(err.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f1014] text-white overflow-hidden relative">
                <WorldCitizenBackground />
                <div className="glass-card max-w-md w-full p-10 text-center border border-white/10 relative z-10">
                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-heading font-bold mb-4">Confirmed!</h2>
                    <p className="text-white/60 mb-8">
                        Thanks {formData.full_name.split(' ')[0]}. We'll be in touch shortly to confirm your {selectedDate ? 'appointment' : 'inquiry'}.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="text-brand-gold hover:underline text-sm"
                    >
                        Start Over
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0f1014] text-white font-sans selection:bg-brand-gold selection:text-brand-navy relative">
            <WorldCitizenBackground />

            {/* Header / Hero */}
            <header className="relative w-full py-12 md:py-20 px-4 flex flex-col items-center justify-center overflow-hidden z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-brand-navy/50 to-transparent z-0"></div>
                <div className="relative z-10 text-center max-w-3xl mx-auto space-y-4">
                    <h1 className="text-4xl md:text-6xl font-heading font-bold tracking-tight">
                        Do Panama <span className="text-brand-gold">Real Estate</span>
                    </h1>
                    <p className="text-white/60 text-lg md:text-xl font-light">
                        Experience the difference of working with a true expert.
                    </p>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-start">

                {/* LEFT COLUMN: Who Am I (Video + Bio) */}
                <div className="space-y-8 animate-in slide-in-from-left-4 duration-700">
                    <div className="relative group cursor-pointer overflow-hidden rounded-2xl glass-card border border-white/10 shadow-2xl aspect-video">
                        {/* Placeholder Image */}
                        <img
                            src="/david-video-thumb.png"
                            alt="David Aguirre Realtor"
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                        />
                        {/* Play Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/20 transition-all">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 group-hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 md:w-8 md:h-8 text-white fill-white ml-1" />
                            </div>
                        </div>
                        <div className="absolute bottom-4 left-4 right-4">
                            <h3 className="text-xl font-bold text-white drop-shadow-md">Who am I?</h3>
                            <p className="text-white/80 text-sm drop-shadow-md">David Aguirre • 15 Years Experience in Panama</p>
                        </div>
                    </div>

                    <div className="prose prose-invert prose-p:text-white/70">
                        <h2 className="text-2xl font-bold text-brand-gold mb-4">About David Aguirre</h2>
                        <p>
                            I'm not just selling properties; I'm curating lifestyles. With over a decade of experience in the Panama market, I simplify the complex world of real estate investment for international buyers.
                        </p>
                        <p>
                            <strong>What I love:</strong> Finding "unicorn" deals, analyzing ROI data, and showing clients the hidden gems of Panama City.
                        </p>

                        <div className="flex gap-4 pt-4">
                            <a href="https://linkedin.com" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-[#0077b5]/20 text-[#0077b5] border border-[#0077b5]/50 rounded-lg hover:bg-[#0077b5] hover:text-white transition-all">
                                <Linkedin className="w-5 h-5" /> LinkedIn
                            </a>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: The Interactive Form */}
                <div className="glass-card p-6 md:p-8 border border-white/10 shadow-[0_0_50px_rgba(255,215,0,0.05)] rounded-2xl animate-in slide-in-from-right-4 duration-700 delay-200">

                    {/* Progress Indicator */}
                    <div className="flex items-center justify-between mb-8 opacity-50 text-xs uppercase tracking-widest font-bold">
                        <span className={step === 1 ? "text-brand-gold" : "text-white"}>Step 1: Profile</span>
                        <div className="h-[1px] flex-1 bg-white/10 mx-4"></div>
                        <span className={step === 2 ? "text-brand-gold" : "text-white"}>Step 2: Tour</span>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-heading font-bold mb-2">Let's get to know you.</h2>
                            <p className="text-white/50 text-sm italic mb-6">
                                "Don't worry, you can be totally transparent with me. I can handle anything." — David
                            </p>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/50 uppercase">Full Name</label>
                                        <input
                                            name="full_name"
                                            value={formData.full_name}
                                            onChange={handleChange}
                                            placeholder="Your Name"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-gold/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/50 uppercase">Email</label>
                                        <input
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@email.com"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-gold/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <label className="text-sm font-bold text-brand-gold uppercase tracking-wider">
                                        Question #1: What type of buyer are you?
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {BUYER_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setFormData(prev => ({ ...prev, buyer_type: type.id }))}
                                                className={`p-4 rounded-xl text-left border transition-all duration-200 flex items-center justify-between group ${formData.buyer_type === type.id
                                                    ? 'bg-brand-gold text-brand-navy border-brand-gold'
                                                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                                    }`}
                                            >
                                                <div>
                                                    <div className="font-extrabold text-base md:text-lg tracking-wide">{type.label}</div>
                                                    <div className={`text-xs md:text-sm mt-1 font-medium ${formData.buyer_type === type.id ? 'text-brand-navy/80' : 'text-white/60'}`}>{type.description}</div>
                                                </div>
                                                {formData.buyer_type === type.id && <CheckCircle className="w-5 h-5" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4">
                                    <label className="text-sm font-bold text-brand-gold uppercase tracking-wider">
                                        Who am I as a client?
                                    </label>
                                    <textarea
                                        name="client_story"
                                        value={formData.client_story}
                                        onChange={(e) => setFormData(prev => ({ ...prev, client_story: e.target.value }))}
                                        placeholder="Tell me everything... (I can handle it)"
                                        rows={4}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-brand-gold/50 outline-none transition-all placeholder:text-white/30 text-sm"
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                            <button
                                onClick={handleNextStep}
                                className="w-full py-4 mt-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all border border-white/5"
                            >
                                Let's See Some Properties <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                            <h2 className="text-2xl font-heading font-bold mb-2">Let's see some properties.</h2>
                            <p className="text-white/60 text-sm mb-6">
                                Select a time for a property tour or a consulting call.
                            </p>

                            {/* Mock Calendar Grid */}
                            <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <button className="text-white/50 hover:text-white">&lt;</button>
                                    <span className="font-bold">February 2026</span>
                                    <button className="text-white/50 hover:text-white">&gt;</button>
                                </div>
                                <div className="grid grid-cols-7 gap-2 text-center text-sm mb-2 opacity-50">
                                    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
                                </div>
                                <div className="grid grid-cols-7 gap-2">
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                        <button
                                            key={day}
                                            onClick={() => setSelectedDate(`2026-02-${day}`)}
                                            className={`aspect-square rounded-lg flex items-center justify-center text-sm transition-all ${selectedDate === `2026-02-${day}`
                                                ? 'bg-brand-gold text-brand-navy font-bold shadow-lg shadow-brand-gold/20'
                                                : 'hover:bg-white/10 text-white/80'
                                                }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {selectedDate && (
                                <div className="grid grid-cols-3 gap-2 animate-in fade-in slide-in-from-top-2">
                                    {['10:00 AM', '2:00 PM', '4:00 PM'].map(time => (
                                        <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-2 rounded-lg text-xs font-bold border ${selectedTime === time
                                                ? 'bg-brand-gold text-brand-navy border-brand-gold'
                                                : 'bg-transparent text-white border-white/20 hover:border-white/50'
                                                }`}
                                        >
                                            {time}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setStep(1)} className="px-4 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white/50">
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedDate || !selectedTime || submitting}
                                    className="flex-1 bg-brand-gold text-brand-navy font-bold py-3 rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                                >
                                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm Booking"}
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}
