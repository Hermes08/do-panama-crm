"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, User, Zap, AlertTriangle, Snowflake, HelpCircle, Briefcase, X, Send, Bot, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // Use the client we set up
import { Client } from "@/types";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import PropertyPDFGenerator from "@/components/PropertyPDFGenerator";
import DashboardCharts from "@/components/DashboardCharts";
import { translations } from "@/lib/i18n";

// Fallback initial data (optional, but good for SSR/static or loading state)
const INITIAL_DATA: Client[] = [];

export default function Home() {
    const [clientsData, setClientsData] = useState<Client[]>(INITIAL_DATA);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isCreatingClient, setIsCreatingClient] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [lang, setLang] = useState<'es' | 'en'>('es');
    const [chatMessage, setChatMessage] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Hola, soy tu asistente de CRM Inteligente. ¿En qué puedo ayudarte hoy? (Tengo acceso a todos tus leads)' }
    ]);

    // Fetch data from Supabase on mount
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data, error } = await supabase
                    .from('crm_clients')
                    .select('*');

                if (error) {
                    console.error('Error fetching clients:', error);
                } else if (data) {
                    setClientsData(data as Client[]);
                }
            } catch (err) {
                console.error("Unexpected error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchClients();
    }, []);

    // Detect browser language
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const browserLang = navigator.language.split('-')[0];
            if (browserLang === 'en') setLang('en');
        }
    }, []);

    const t = translations[lang];

    // Derived state for stats
    const stats = useMemo(() => {
        return {
            total: clientsData.length,
            hot: clientsData.filter(c => c.tag?.toLowerCase().includes("hot") || c.tag?.includes("🔥")).length,
            active: clientsData.filter(c => c.status?.toLowerCase().includes("seguimiento") || c.status?.toLowerCase().includes("pendiente") || c.status?.toLowerCase().includes("active")).length,
            suspicious: clientsData.filter(c => c.tag?.toLowerCase().includes("sospechoso") || c.tag?.includes("⚠️")).length,
            closing: clientsData.filter(c => c.status === "Cerrando" || c.status === "Cerrado" || c.tag?.toLowerCase().includes("cierre")).length,
        };
    }, [clientsData]);

    // Filter Logic
    const filteredClients = useMemo(() => {
        let data = clientsData;

        // Stat Card Filtering
        if (statusFilter === "hot") {
            data = data.filter(c => c.tag?.toLowerCase().includes("hot") || c.tag?.includes("🔥"));
        } else if (statusFilter === "active") {
            data = data.filter(c => c.status?.toLowerCase().includes("seguimiento") || c.status?.toLowerCase().includes("pendiente") || c.status?.toLowerCase().includes("active"));
        } else if (statusFilter === "suspicious") {
            data = data.filter(c => c.tag?.toLowerCase().includes("sospechoso") || c.tag?.includes("⚠️"));
        } else if (statusFilter === "closing") {
            data = data.filter(c => c.status === "Cerrando" || c.status === "Cerrado" || c.tag?.toLowerCase().includes("cierre"));
        }

        // Search Filtering
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            data = data.filter(c =>
                c.full_name.toLowerCase().includes(lowerTerm) ||
                c.zone_project?.toLowerCase().includes(lowerTerm) ||
                c.status?.toLowerCase().includes(lowerTerm)
            );
        }

        return data;
    }, [clientsData, searchTerm, statusFilter]);

    // Helper to handle stat click
    const handleStatClick = (type: string | null) => {
        setStatusFilter(type);
        if (type) {
            setActiveTab("clientes");
            setSearchTerm("");
        }
    };

    // Proactive AI Suggestions (Smarter Logic)
    useEffect(() => {
        if (activeTab === 'chat' && chatHistory.length === 1 && clientsData.length > 0) {
            // Logic 1: Find clients with "Low Data" (missing > 2 key fields)
            const lowDataClients = clientsData.filter(c => {
                let missingCount = 0;
                if (!c.budget) missingCount++;
                if (!c.email && !c.phone) missingCount++;
                if (!c.interest_category) missingCount++;
                return missingCount >= 2;
            }).slice(0, 3);

            // Logic 2: Untouched Clients (Last contact > 7 days or null)
            const today = new Date();
            const untouchedClients = clientsData.filter(c => {
                if (!c.last_contact_date) return true;
                const last = new Date(c.last_contact_date);
                const diffTime = Math.abs(today.getTime() - last.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays > 7;
            }).slice(0, 3);

            // Logic 3: Upcoming Calendar (Real check)
            const currentMonthKey = "2026-02"; // dynamic in real app: new Date().toISOString().slice(0, 7)
            const upcomingTravel = clientsData.filter(c => c.estimated_travel_date?.startsWith(currentMonthKey)).length;

            let proactiveMsg = "";
            if (lang === 'es') {
                proactiveMsg = `👋 **Análisis Semanal:**\n\n`;
                if (upcomingTravel > 0) proactiveMsg += `• 📅 Tienes **${upcomingTravel}** visitas programadas para ${currentMonthKey}.\n`;
                if (lowDataClients.length > 0) proactiveMsg += `• ⚠️ **Falta Información:** ${lowDataClients.map(c => c.full_name).join(", ")} tienen pocos datos.\n`;
                if (untouchedClients.length > 0) proactiveMsg += `• 🕰️ **Sin Contacto:** No has hablado con ${untouchedClients.map(c => c.full_name).join(", ")} recientemente.\n`;
                proactiveMsg += `\n¿Por dónde quieres empezar?`;
            } else {
                proactiveMsg = `👋 **Weekly Analysis:**\n\n`;
                if (upcomingTravel > 0) proactiveMsg += `• 📅 You have **${upcomingTravel}** visits scheduled for ${currentMonthKey}.\n`;
                if (lowDataClients.length > 0) proactiveMsg += `• ⚠️ **Missing Info:** ${lowDataClients.map(c => c.full_name).join(", ")} need updates.\n`;
                if (untouchedClients.length > 0) proactiveMsg += `• 🕰️ **No Contact:** You haven't spoken to ${untouchedClients.map(c => c.full_name).join(", ")} recently.\n`;
                proactiveMsg += `\nWhere should we start?`;
            }

            setTimeout(() => {
                setChatHistory(prev => [...prev, { role: 'ai', content: proactiveMsg }]);
            }, 800);
        }
    }, [activeTab, clientsData, lang]);

    const handleDownload = () => {
        // Simple CSV Export
        const headers = ["ID", "Name", "Status", "Tag", "Budget", "Next Action", "Date"];
        const rows = clientsData.map(c => [
            c.id,
            `"${c.full_name}"`,
            c.status,
            c.tag,
            c.budget || "0",
            `"${c.next_action || ""}"`,
            c.next_action_date || ""
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `crm_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSendMessage = async () => {
        if (!chatMessage.trim() || isThinking) return;

        const userText = chatMessage;
        const newHistory = [...chatHistory, { role: 'user' as const, content: userText }];
        setChatHistory(newHistory);
        setChatMessage("");
        setIsThinking(true);

        try {
            // Map roles 'ai' -> 'assistant' for OpenAI API compatibility
            const apiMessages = newHistory.map(m => ({
                role: m.role === 'ai' ? 'assistant' : m.role,
                content: m.content
            }));

            const response = await fetch("/.netlify/functions/chat-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: apiMessages,
                    lang: lang
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "API Error");
            }

            const data = await response.json();

            setChatHistory(prev => [...prev, {
                role: 'ai',
                content: data.content
            }]);

            // If an action was taken, re-fetch clients to update UI
            if (data.actionTaken) {
                const { data: updatedClients } = await supabase.from('crm_clients').select('*');
                if (updatedClients) setClientsData(updatedClients as Client[]);
            }

        } catch (err: any) {
            setChatHistory(prev => [...prev, {
                role: 'ai',
                content: (lang === 'es' ? "Error: " : "Error: ") + (err.message || (lang === 'es' ? "Error desconocido" : "Unknown error"))
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="min-h-screen p-8 flex flex-col gap-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="glass-card p-4 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                        🏢 {t.title} <span className="text-brand-gold italic">Pro</span>
                    </h1>
                    <p className="text-brand-light/80 font-light text-sm md:text-base">
                        {t.subtitle} • {stats.total} {lang === 'es' ? 'Clientes' : 'Clients'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-3 md:gap-4 relative z-10 w-full md:w-auto">
                    <button
                        onClick={() => setLang(l => l === 'es' ? 'en' : 'es')}
                        className="glass-btn px-4 font-mono text-sm py-2 flex-1 md:flex-none"
                    >
                        {lang.toUpperCase()}
                    </button>
                    <button
                        onClick={() => setIsCreatingClient(true)}
                        className="glass-btn flex items-center justify-center gap-2 bg-brand-gold/20 text-brand-gold border-brand-gold/50 hover:bg-brand-gold hover:text-brand-navy py-2 flex-1 md:flex-none"
                    >
                        <span className="text-lg font-bold">+</span> {lang === 'es' ? 'Nuevo' : 'New'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="glass-btn flex items-center justify-center gap-2 py-2 flex-1 md:flex-none"
                    >
                        <span>📥</span> <span className="hidden sm:inline">{t.buttons.download}</span><span className="sm:hidden">{lang === 'es' ? 'Exp' : 'Exp'}</span>
                    </button>
                </div>

                {/* Decorational glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-gold/20 transition-all duration-700"></div>
            </header>

            {/* Tabs - Scrollable on mobile */}
            <div className="flex gap-2 min-w-full overflow-x-auto pb-2 scrollbar-hide md:flex-wrap md:gap-4 md:overflow-visible">
                {[
                    { id: 'dashboard', label: t.tabs.dashboard },
                    { id: 'clientes', label: t.tabs.clientes },
                    { id: 'calendar', label: t.tabs.calendar },
                    { id: 'chat', label: t.tabs.chat },
                    { id: 'propiedades', label: t.tabs.propiedades }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); if (tab.id !== 'clientes') setStatusFilter(null); }}
                        className={`px-4 md:px-6 py-2 md:py-3 rounded-xl font-heading font-semibold transition-all duration-300 whitespace-nowrap text-sm md:text-base ${activeTab === tab.id
                            ? 'bg-white text-brand-navy shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {statusFilter && activeTab === 'clientes' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-brand-gold/20 text-brand-gold rounded-lg border border-brand-gold/30 animate-in fade-in slide-in-from-left-4">
                    <span className="text-sm font-bold">Filter: {statusFilter.toUpperCase()}</span>
                    <button onClick={() => setStatusFilter(null)} className="hover:text-white"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Content Based on Tab */}
            {activeTab === 'chat' ? (
                <div className="glass-card min-h-[600px] flex flex-col relative overflow-hidden">
                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                        {chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-brand-gold text-brand-navy rounded-br-none'
                                    : 'bg-white/10 text-white rounded-bl-none border border-white/5'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-1 opacity-50 text-xs">
                                        {msg.role === 'ai' ? <Bot className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                        <span>{msg.role === 'ai' ? 'AI Assistant' : 'You'}</span>
                                    </div>
                                    <p>{msg.content}</p>
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start">
                                <div className="bg-white/5 text-white p-4 rounded-2xl rounded-bl-none border border-white/5 flex items-center gap-3">
                                    <Bot className="w-4 h-4 animate-bounce text-brand-gold" />
                                    <span className="text-sm opacity-50 italic">{lang === 'es' ? 'Pensando...' : 'Thinking...'}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white/5 border-t border-white/10">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={lang === 'en' ? "Ask (e.g. 'Update Tom to Hot', 'Who travels in Feb?')..." : "Pregunta (ej. 'Pon a Tom en Hot', '¿Quién viaja en Feb?')..."}
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-4 pl-6 pr-14 text-white placeholder:text-white/30 focus:outline-none focus:border-brand-gold/50 transition-colors"
                            />
                            <button
                                onClick={handleSendMessage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-brand-gold text-brand-navy rounded-lg hover:bg-white transition-colors"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'calendar' ? (
                <div className="glass-card p-8 min-h-[500px]">
                    <h2 className="font-heading text-2xl font-bold mb-6">{t.labels.dates}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Upcoming Months Logic (Mock for now, real sorting later) */}
                        {['2026-02', '2026-03', '2026-04'].map((monthKey, idx) => {
                            // Helper to display clean month name (e.g. "February 2026")
                            // FIX: Append T12:00:00 to prevent timezone rollovers (e.g. Feb 1 becoming Jan 31)
                            const dateObj = new Date(monthKey + '-01T12:00:00');
                            const displayParams = { month: 'long', year: 'numeric' } as const;
                            const displayName = lang === 'es'
                                ? dateObj.toLocaleDateString('es-ES', displayParams)
                                : dateObj.toLocaleDateString('en-US', displayParams);

                            // Upper case first letter for Spanish
                            const finalDisplayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                            return (
                                <div key={monthKey} className="bg-white/5 rounded-xl border border-white/5 p-4">
                                    <h3 className="text-lg font-bold text-brand-gold mb-3">{finalDisplayName}</h3>
                                    <div className="space-y-3">
                                        {clientsData.filter(c => {
                                            // Strict Filter: Match exactly YYYY-MM
                                            const travelMatch = c.estimated_travel_date && c.estimated_travel_date.startsWith(monthKey);
                                            const actionMatch = c.next_action_date && c.next_action_date.startsWith(monthKey);
                                            return travelMatch || actionMatch;
                                        }).slice(0, 5).map(c => (
                                            <div key={c.id} onClick={() => setSelectedClient(c)} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer transition-colors">
                                                <p className="font-bold text-sm">{c.full_name}</p>
                                                <div className="flex justify-between text-xs text-white/50 mt-1">
                                                    <span>{c.next_action}</span>
                                                    <span className="text-blue-300">{c.estimated_travel_date}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {clientsData.filter(c => (c.estimated_travel_date && c.estimated_travel_date.startsWith(monthKey)) || (c.next_action_date && c.next_action_date.startsWith(monthKey))).length === 0 && <p className="text-xs text-white/30 italic">No events</p>}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
                            {[
                                { label: t.stats.total, value: stats.total, icon: User, type: null },
                                { label: t.stats.hot, value: stats.hot, icon: Zap, color: "text-brand-gold", type: "hot" },
                                { label: t.stats.closing, value: stats.closing, icon: Briefcase, color: "text-purple-400", type: "closing" },
                                { label: t.stats.active, value: stats.active, icon: AlertTriangle, color: "text-green-400", type: "active" },
                                { label: t.stats.suspicious, value: stats.suspicious, icon: HelpCircle, color: "text-orange-300", type: "suspicious" },
                            ].map((stat, i) => (
                                <div
                                    key={i}
                                    onClick={() => handleStatClick(stat.type)}
                                    className={`glass-card p-6 flex items-center justify-between transition-all duration-300 cursor-pointer group
                                        ${statusFilter === stat.type ? 'bg-white/10 border-brand-gold/50 scale-105 shadow-xl' : 'hover:bg-white/10 border-transparent'}
                                    `}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-white/40 text-[10px] md:text-xs font-medium uppercase tracking-wider mb-1">{stat.label}</span>
                                        <span className={`text-2xl md:text-3xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</span>
                                    </div>
                                    <stat.icon className={`w-6 h-6 md:w-8 md:h-8 opacity-50 group-hover:opacity-100 transition-opacity ${stat.color || 'text-white'}`} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Advanced Charts Section */}
                    {activeTab === 'dashboard' && (
                        <DashboardCharts clients={filteredClients} lang={lang} />
                    )}

                    {/* Main Content Area (Client List) */}
                    {(activeTab === 'dashboard' || activeTab === 'clientes') && (
                        <div className="glass-card p-4 md:p-8 min-h-[500px]">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
                                <h2 className="font-heading text-xl md:text-2xl font-bold">
                                    {activeTab === 'dashboard'
                                        ? (lang === 'es' ? '🔥 Clientes Prioritarios' : '🔥 Priority Clients')
                                        : (lang === 'es' ? '📋 Lista de Clientes' : '📋 Client List')}
                                </h2>
                                <div className="relative w-full sm:w-auto">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                                    <input
                                        type="text"
                                        placeholder={t.searchPlaceholder}
                                        className="glass-input pl-10 w-full sm:w-64"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {filteredClients.slice(0, activeTab === 'dashboard' ? 5 : undefined).map((client) => {
                                    // Translation helper
                                    // @ts-ignore
                                    const translatedStatus = t.status[client.status?.trim()] || client.status;
                                    // @ts-ignore
                                    const translatedTag = t.tags[client.tag?.replace(/^[^\w]+/, '').trim()] || client.tag;

                                    return (
                                        <div
                                            key={client.id}
                                            onClick={() => setSelectedClient(client)}
                                            className="glass-card p-4 md:p-6 hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-brand-gold/30 group"
                                        >
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center flex-wrap gap-2 md:gap-3 mb-2">
                                                        <h3 className="text-lg md:text-xl font-bold truncate">{client.full_name}</h3>
                                                        {client.tag && (
                                                            <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${client.tag.includes("Hot") ? "bg-brand-gold text-brand-navy animate-pulse" : "bg-white/10"
                                                                }`}>
                                                                {translatedTag}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs md:text-sm text-white/70">
                                                        {client.zone_project && <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-brand-gold" /> {client.zone_project}</span>}
                                                        {client.interest_category && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-blue-400" /> {client.interest_category}</span>}
                                                        <span className={`${client.status?.includes("No") ? "text-red-300" : "text-green-300"} flex items-center gap-1`}>
                                                            {translatedStatus}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                                    <button className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg flex items-center gap-1">
                                                        {t.buttons.details} &rarr;
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {filteredClients.length === 0 && (
                                    <div className="text-center py-20 text-white/50">
                                        {lang === 'es' ? 'No hay resultados' : 'No results found'}
                                    </div>
                                )}

                                {activeTab === 'dashboard' && filteredClients.length > 5 && (
                                    <button
                                        onClick={() => setActiveTab('clientes')}
                                        className="w-full py-4 text-center text-white/50 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-dashed border-white/10 hover:border-white/30"
                                    >
                                        {lang === 'es' ? 'Ver todos los clientes...' : 'View all clients...'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Property PDF Generator Tab */}
            {activeTab === 'propiedades' && (
                <div className="glass-card p-8">
                    <PropertyPDFGenerator lang={lang} />
                </div>
            )}

            {/* Scroll to top when Properties tab opens */}
            {activeTab === 'propiedades' && typeof window !== 'undefined' && (() => {
                setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
                return null;
            })()}

            {/* LeadDetailsModal */}
            <LeadDetailsModal
                isOpen={!!selectedClient || isCreatingClient}
                onClose={() => { setSelectedClient(null); setIsCreatingClient(false); }}
                client={selectedClient}
                lang={lang}
                onClientUpdated={(updatedClient) => {
                    setClientsData(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
                    setSelectedClient(updatedClient);
                }}
                onClientCreated={(newClient) => {
                    setClientsData(prev => [newClient, ...prev]);
                    setIsCreatingClient(false);
                    // Optionally open it immediately as selected
                    setSelectedClient(newClient);
                }}
            />
        </div>
    );
}
