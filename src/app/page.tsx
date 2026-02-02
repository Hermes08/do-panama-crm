"use client";

import { useState } from "react";
import { Search, User, Zap, AlertTriangle, Snowflake, HelpCircle } from "lucide-react";

// Mock data for visual demo if DB is empty
const MOCK_CLIENTS = [
    { id: "1", full_name: "Tammy Tumbling Blink", status: "🟡 Pendiente respuesta", interest_category: "Compra", tag: "Hot", zone_project: "Ocean Reef" },
    { id: "2", full_name: "Tokumbo", status: "🟡 Pendiente respuesta", interest_category: "Alquiler", tag: "Hot", zone_project: "Nugal, Bosco" },
    { id: "3", full_name: "Amy & Eldrick Link", status: "🟢 En seguimiento", interest_category: "Compra", tag: "Hot", zone_project: "Varias zonas" },
];

export default function Home() {
    const [activeTab, setActiveTab] = useState("dashboard");

    return (
        <div className="min-h-screen p-8 flex flex-col gap-8 max-w-7xl mx-auto">
            {/* Header */}
            <header className="glass-card p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden group">
                <div className="relative z-10">
                    <h1 className="font-heading text-4xl font-bold text-white mb-2 tracking-tight">
                        🏢 CRM Inmobiliario <span className="text-brand-gold italic">Pro</span>
                    </h1>
                    <p className="text-brand-light/80 font-light">Sistema completo con todas las notas y detalles</p>
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
                    { label: "Total", value: "57", icon: User },
                    { label: "Hot Leads", value: "8", icon: Zap, color: "text-brand-gold" },
                    { label: "Activos", value: "15", icon: AlertTriangle, color: "text-green-400" },
                    { label: "Sospechosos", value: "4", icon: HelpCircle, color: "text-orange-300" },
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
                    <h2 className="font-heading text-2xl font-bold">🔥 Clientes Prioritarios</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="glass-input pl-10 w-64"
                        />
                    </div>
                </div>

                <div className="grid gap-4">
                    {MOCK_CLIENTS.map((client) => (
                        <div key={client.id} className="glass-card p-6 hover:bg-white/10 transition-all cursor-pointer border border-white/5 hover:border-brand-gold/30 group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-xl font-bold">{client.full_name}</h3>
                                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-gold text-brand-navy animate-pulse">
                                            {client.tag}
                                        </span>
                                    </div>
                                    <div className="flex gap-4 text-sm text-white/70">
                                        <span>📍 {client.zone_project}</span>
                                        <span>💼 {client.interest_category}</span>
                                        <span>{client.status}</span>
                                    </div>
                                </div>
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-lg">Ver Detalles &rarr;</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
