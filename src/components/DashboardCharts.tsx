"use client";

import { useMemo } from "react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Client } from "@/types";

interface DashboardChartsProps {
    clients: Client[];
    lang: 'es' | 'en';
}

export default function DashboardCharts({ clients, lang }: DashboardChartsProps) {
    const t = lang === 'es' ? {
        statusDistribution: "Distribución por Estado",
        monthlyTrends: "Tendencias Mensuales",
        conversionFunnel: "Embudo de Conversión",
        clients: "Clientes",
    } : {
        statusDistribution: "Status Distribution",
        monthlyTrends: "Monthly Trends",
        conversionFunnel: "Conversion Funnel",
        clients: "Clients",
    };

    // Status Distribution (Donut Chart)
    const statusData = useMemo(() => {
        const statusCount: Record<string, number> = {};
        clients.forEach(c => {
            const status = c.status || "Unknown";
            statusCount[status] = (statusCount[status] || 0) + 1;
        });
        return Object.entries(statusCount).map(([name, value]) => ({ name, value }));
    }, [clients]);

    // Monthly Trends (Line Chart)
    const monthlyData = useMemo(() => {
        const monthCount: Record<string, number> = {};
        clients.forEach(c => {
            if (c.created_at) {
                const month = c.created_at.substring(0, 7); // YYYY-MM
                monthCount[month] = (monthCount[month] || 0) + 1;
            }
        });
        return Object.entries(monthCount)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6) // Last 6 months
            .map(([month, count]) => ({ month, count }));
    }, [clients]);

    // Conversion Funnel (Bar Chart)
    const funnelData = useMemo(() => {
        const stages = [
            { name: "Prospecto", count: clients.filter(c => c.status === "Prospecto").length },
            { name: "En seguimiento", count: clients.filter(c => c.status?.includes("seguimiento")).length },
            { name: "Cerrando", count: clients.filter(c => c.status === "Cerrando").length },
            { name: "Cerrado", count: clients.filter(c => c.status === "Cerrado").length },
        ];
        return stages;
    }, [clients]);

    const COLORS = ['#00f2ea', '#7d00ff', '#d4af37', '#ff6b6b', '#4ecdc4', '#45b7d1'];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Status Distribution - Donut Chart */}
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">{t.statusDistribution}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                            label={(entry) => entry.name}
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(10, 25, 47, 0.9)',
                                border: '1px solid rgba(0, 242, 234, 0.3)',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Monthly Trends - Line Chart */}
            <div className="glass-card p-6">
                <h3 className="text-xl font-bold text-white mb-4">{t.monthlyTrends}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="month"
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(10, 25, 47, 0.9)',
                                border: '1px solid rgba(0, 242, 234, 0.3)',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="count"
                            stroke="#00f2ea"
                            strokeWidth={3}
                            dot={{ fill: '#00f2ea', r: 5 }}
                            activeDot={{ r: 8 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Conversion Funnel - Bar Chart */}
            <div className="glass-card p-6 lg:col-span-2">
                <h3 className="text-xl font-bold text-white mb-4">{t.conversionFunnel}</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            type="number"
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                        />
                        <YAxis
                            type="category"
                            dataKey="name"
                            stroke="#fff"
                            tick={{ fill: '#fff', fontSize: 12 }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(10, 25, 47, 0.9)',
                                border: '1px solid rgba(125, 0, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                        />
                        <Bar
                            dataKey="count"
                            fill="url(#colorGradient)"
                            radius={[0, 8, 8, 0]}
                        />
                        <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#7d00ff" />
                                <stop offset="100%" stopColor="#00f2ea" />
                            </linearGradient>
                        </defs>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
