"use client";

import { useState, useMemo } from "react";
import { Search, User, Zap, AlertTriangle, Snowflake, HelpCircle, Briefcase } from "lucide-react";
import CLIENTS_DATA from "@/data/clients.json";
import { Client } from "@/types";
import LeadDetailsModal from "@/components/LeadDetailsModal";

export default function Home() {
    const [activeTab, setActiveTab] = useState("dashboard");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);

    // Derived state for stats
    const stats = useMemo(() => {
        return {
            total: CLIENTS_DATA.length,
            hot: CLIENTS_DATA.filter(c => c.tag?.toLowerCase().includes("hot")).length,
            active: CLIENTS_DATA.filter(c => c.status?.toLowerCase().includes("seguimiento") || c.status?.toLowerCase().includes("pendiente")).length, // Broad logic, can be refined
            suspicious: CLIENTS_DATA.filter(c => c.tag?.toLowerCase().includes("sospechoso")).length,
        };
    }, []);

    // Filter Logic
    const filteredClients = useMemo(() => {
        let data = CLIENTS_DATA;

        // Tab Filtering (example logic)
        if (activeTab === "dashboard") {
            // Dashboard shows only priority/recent or just a subset? 
            // For now let's show ALL but maybe sort by priority if we had a sort field.
            // Or maybe just show 'Hot' ones? 
            // Let's stick to ALL but filtered by search.
        } else if (activeTab === "clientes") {
            // Show all (same as dashboard for now, but tab state is ready for different views)
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
    }, [activeTab, searchTerm]);

    return (
        <div className="min-h-screen p-8 flex flex-col gap-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="glass-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <h1 className="font-heading text-4xl font-bold text-white mb-2 tracking-tight">
                        🏢 CRM Inmobiliario <span className="text-brand-gold italic">Pro</span>
                    </h1>
                    <p className="text-brand-light/80 font-light">
                        Sistema completo • {stats.total} Clientes en base de datos
                    </p>
                </div>

                <div className="flex gap-4 relative z-10">
                    <button className="glass-btn flex items-center gap-2">
                        <span>📥</span> Descargar Excel
                    </button>
                </div>

                {/* Decorational glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-brand-gold/20 transition-all duration-700"></div>
            </header>

            {/* Tabs */}
            <div className="flex gap-4">
                {['dashboard', 'clientes', 'chat'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-3 rounded-xl font-heading font-semibold transition-all duration-300 ${activeTab === tab
                            ? 'bg-white text-brand-navy shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                            : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Total", value: stats.total, icon: User },
                    { label: "Hot Leads", value: stats.hot, icon: Zap, color: "text-brand-gold" },
                    { label: "Activos", value: stats.active, icon: AlertTriangle, color: "text-green-400" },
                    { label: "Sospechosos", value: stats.suspicious, icon: HelpCircle, color: "text-orange-300" },
                ].map((stat, i) => (
                    <div key={i} className="glass-card p-6 flex items-center justify-between hover:bg-white/10 cursor-pointer group">
                        <div>
                            <p className="text-sm uppercase tracking-wider text-white/50 mb-1">{stat.label}</p>
                            <p className={`text-4xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</p>
                        </div>
                        <stat.icon className={`w-8 h-8 opacity-50 group-hover:opacity-100 transition-opacity ${stat.color || 'text-white'}`} />
                    </div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="glass-card p-8 min-h-[500px]">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="font-heading text-2xl font-bold">
                        {activeTab === 'dashboard' ? '🔥 Clientes Prioritarios' : '📋 Lista de Clientes'}
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <input
                            type="text"
                            placeholder="Buscar cliente, zona..."
                            className="glass-input pl-10 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid gap-4">
                    {filteredClients.map((client) => (
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
                                    <div className="flex gap-4 text-sm text-white/70">
                                        {client.zone_project && <span>📍 {client.zone_project}</span>}
                                        {client.interest_category && <span>💼 {client.interest_category}</span>}
                                        <span className={client.status?.includes("No") ? "text-red-300" : "text-green-300"}>
                                            {client.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg">
                                        Ver Detalles &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredClients.length === 0 && (
                        <div className="text-center py-20 text-white/50">
                            No se encontraron clientes con "{searchTerm}"
                        </div>
                    )}
                </div>
            </div>

            {/* Lead Details Modal */}
            <LeadDetailsModal
                isOpen={!!selectedClient}
                onClose={() => setSelectedClient(null)}
                client={selectedClient}
            />
        </div>
    );
}
