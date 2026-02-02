"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, User, Zap, AlertTriangle, Snowflake, HelpCircle, Briefcase, X, Send, Bot, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // Use the client we set up
import { Client } from "@/types";
import LeadDetailsModal from "@/components/LeadDetailsModal";
import { translations } from "@/lib/i18n";

// Fallback initial data (optional, but good for SSR/static or loading state)
const INITIAL_DATA: Client[] = [];

export default function Home() {
    const [clientsData, setClientsData] = useState<Client[]>(INITIAL_DATA);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("dashboard");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [lang, setLang] = useState<'es' | 'en'>('es');
    const [chatMessage, setChatMessage] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Hola, soy tu asistente de CRM. ¿En qué puedo ayudarte hoy?' }
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

    const handleSendMessage = () => {
        if (!chatMessage.trim()) return;

        const newHistory = [...chatHistory, { role: 'user' as const, content: chatMessage }];
        setChatHistory(newHistory);
        setChatMessage("");

        // Simulate AI response for now
        setTimeout(() => {
            setChatHistory(prev => [...prev, {
                role: 'ai',
                content: lang === 'en' ? "I'm analyzing your request... (AI integration coming soon)" : "Analizando tu solicitud... (Integración AI pronto)"
            }]);
        }, 1000);
    };

    return (
        <div className="min-h-screen p-8 flex flex-col gap-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="glass-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <h1 className="font-heading text-4xl font-bold text-white mb-2 tracking-tight">
                        🏢 {t.title} <span className="text-brand-gold italic">Pro</span>
                    </h1>
                    <p className="text-brand-light/80 font-light">
                        {t.subtitle} • {stats.total} {lang === 'es' ? 'Clientes' : 'Clients'}
                    </p>
                </div>

                <div className="flex gap-4 relative z-10">
                    <button
                        onClick={() => setLang(l => l === 'es' ? 'en' : 'es')}
                        className="glass-btn px-4 font-mono text-sm"
                    >
                        {lang.toUpperCase()}
                    </button>
                    <button className="glass-btn flex items-center gap-2">
                        <span>📥</span> {t.buttons.download}
                    </button>
                </div>

                {/* Decorational glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-gold/20 transition-all duration-700"></div>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 items-center flex-wrap">
                {[
                    { id: 'dashboard', label: t.tabs.dashboard },
                    { id: 'clientes', label: t.tabs.clientes },
                    { id: 'chat', label: t.tabs.chat }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id); if (tab.id !== 'clientes') setStatusFilter(null); }}
                        className={`px-6 py-3 rounded-xl font-heading font-semibold transition-all duration-300 ${activeTab === tab.id
                            ? 'bg-white text-brand-navy shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}

                {statusFilter && activeTab === 'clientes' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-brand-gold/20 text-brand-gold rounded-lg border border-brand-gold/30 animate-in fade-in slide-in-from-left-4">
                        <span className="text-sm font-bold">Filter: {statusFilter.toUpperCase()}</span>
                        <button onClick={() => setStatusFilter(null)} className="hover:text-white"><X className="w-4 h-4" /></button>
                    </div>
                )}
            </div>

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
                    </div>
                    <div className="p-4 bg-white/5 border-t border-white/10">
                        <div className="relative">
                            <input
                                type="text"
                                value={chatMessage}
                                onChange={(e) => setChatMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                placeholder={lang === 'en' ? "Ask about a client, property, or legal process..." : "Pregunta sobre un cliente, propiedad o trámite legal..."}
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
            ) : (
                <>
                    {/* Stats Grid - Always visible on Dashboard, optional on Clients? Let's keep on Dashboard only or both? Logic says Dashboard. */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: t.stats.total, value: stats.total, icon: User, type: null },
                                { label: t.stats.hot, value: stats.hot, icon: Zap, color: "text-brand-gold", type: "hot" },
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
                                    <div>
                                        <p className="text-sm uppercase tracking-wider text-white/50 mb-1">{stat.label}</p>
                                        <p className={`text-4xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                                    </div>
                                    <stat.icon className={`w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity ${stat.color || 'text-white'}`} />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Main Content Area */}
                    <div className="glass-card p-8 min-h-[500px]">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                            <h2 className="font-heading text-2xl font-bold">
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
                            {filteredClients.slice(0, activeTab === 'dashboard' ? 5 : undefined).map((client) => (
                                <div
                                    key={client.id}
                                    onClick={() => setSelectedClient(client)}
                                    className="glass-card p-6 hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-brand-gold/30 group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold">{client.full_name}</h3>
                                                {client.tag && (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.tag.includes("Hot") ? "bg-brand-gold text-brand-navy animate-pulse" : "bg-white/10"
                                                        }`}>
                                                        {client.tag}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-sm text-white/70">
                                                {client.zone_project && <span className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-brand-gold" /> {client.zone_project}</span>}
                                                {client.interest_category && <span className="flex items-center gap-1"><Briefcase className="w-3 h-3 text-blue-400" /> {client.interest_category}</span>}
                                                <span className={`${client.status?.includes("No") ? "text-red-300" : "text-green-300"} flex items-center gap-1`}>
                                                    {client.status}
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
                            ))}

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
                </>
            )}

            {/* Lead Details Modal */}
            <LeadDetailsModal
                isOpen={!!selectedClient}
                onClose={() => setSelectedClient(null)}
                client={selectedClient}
                onClientUpdated={(updatedClient) => {
                    setClientsData(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
                    setSelectedClient(updatedClient); // Keep modal open with updated data
                }}
            />
        </div>
    );
}
