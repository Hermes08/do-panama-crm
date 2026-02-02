"use client";

import { X, Calendar, MapPin, DollarSign, User, Tag, Clock, Briefcase } from "lucide-react";
import { type Client } from "@/types";

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
}

export default function LeadDetailsModal({ isOpen, onClose, client }: LeadDetailsModalProps) {
    if (!isOpen || !client) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-2xl bg-[#0f1014]/90 border border-white/10 rounded-2xl shadow-2xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-white/5 bg-white/5">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-2xl font-bold text-white font-heading">{client.full_name}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.tag?.includes("Hot") ? "bg-brand-gold text-brand-navy" : "bg-white/10 text-white"
                                }`}>
                                {client.tag || "Sin etiqueta"}
                            </span>
                        </div>
                        <p className="text-white/60 text-sm flex items-center gap-2">
                            <span className="font-mono text-xs opacity-50">{client.id}</span>
                            <span>•</span>
                            <span className="text-brand-gold/80">{client.status}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Zona / Proyecto</p>
                                <p className="font-medium">{client.zone_project || "No especificado"}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <Briefcase className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Interés</p>
                                <p className="font-medium">{client.interest_category || "No especificado"}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <DollarSign className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Presupuesto</p>
                                <p className="font-medium">{client.budget ? `$${client.budget}` : "No definido"}</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <User className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Atiende</p>
                                <p className="font-medium">{client.assigned_to || "Sin asignar"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline / Dates */}
                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                        <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Fechas Importantes
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div>
                                <p className="text-white/50 mb-1">Último Contacto</p>
                                <p>{client.last_contact_date || "-"}</p>
                            </div>
                            <div>
                                <p className="text-white/50 mb-1">Próxima Acción ({client.next_action})</p>
                                <p className="text-brand-gold">{client.next_action_date || "Pendiente"}</p>
                            </div>
                            <div>
                                <p className="text-white/50 mb-1">Viaje Estimado</p>
                                <p className="text-blue-300">{client.estimated_travel_date || "-"}</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Notes */}
                    <div className="p-5 rounded-xl bg-brand-navy/50 border border-white/10">
                        <h3 className="text-sm font-bold text-white/90 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Historial y Notas
                        </h3>
                        <div className="prose prose-invert prose-sm max-w-none text-white/70 whitespace-pre-wrap font-light">
                            {client.detailed_notes || "No hay notas adicionales."}
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/5 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-lg bg-white text-brand-navy font-bold hover:bg-gray-200 transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
