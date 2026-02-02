"use client";

import { useState, useEffect } from "react";
import { X, Calendar, MapPin, DollarSign, User, Tag, Clock, Briefcase, Edit2, Save, Loader2 } from "lucide-react";
import { type Client } from "@/types";
import { supabase } from "@/lib/supabaseClient";

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    onClientUpdated: (updatedClient: Client) => void;
}

export default function LeadDetailsModal({ isOpen, onClose, client, onClientUpdated }: LeadDetailsModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Client>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (client) {
            setFormData(client);
            setIsEditing(false);
        }
    }, [client, isOpen]);

    if (!isOpen || !client) return null;

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('crm_clients')
                .update(formData)
                .eq('id', client.id);

            if (error) throw error;

            // Notify parent to update state locally
            onClientUpdated({ ...client, ...formData } as Client);
            setIsEditing(false);
        } catch (err) {
            console.error("Error saving client:", err);
            alert("Error al guardar cambios");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof Client, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

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
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            {isEditing ? (
                                <input
                                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-2xl font-bold text-white font-heading w-full"
                                    value={formData.full_name || ""}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                />
                            ) : (
                                <h2 className="text-2xl font-bold text-white font-heading">{client.full_name}</h2>
                            )}

                            {isEditing ? (
                                <input
                                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-xs font-bold w-32"
                                    value={formData.tag || ""}
                                    onChange={(e) => handleChange('tag', e.target.value)}
                                    placeholder="Tag (e.g. Hot)"
                                />
                            ) : (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.tag?.includes("Hot") ? "bg-brand-gold text-brand-navy" : "bg-white/10 text-white"}`}>
                                    {client.tag || "Sin etiqueta"}
                                </span>
                            )}
                        </div>
                        <p className="text-white/60 text-sm flex items-center gap-2">
                            <span className="font-mono text-xs opacity-50">{client.id}</span>
                            <span>•</span>
                            {isEditing ? (
                                <select
                                    className="bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-brand-gold"
                                    value={formData.status || ""}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                >
                                    <option value=" En seguimiento">En seguimiento</option>
                                    <option value=" Pendiente respuesta">Pendiente respuesta</option>
                                    <option value=" No seguimiento">No seguimiento</option>
                                    <option value="Cliente activo">Cliente activo</option>
                                </select>
                            ) : (
                                <span className="text-brand-gold/80">{client.status}</span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-brand-gold hover:text-white"
                                title="Editar Cliente"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="p-2 bg-brand-gold/20 hover:bg-brand-gold/40 rounded-lg transition-colors text-brand-gold self-start flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">

                    {/* Key Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
                            <div className="w-full">
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Zona / Proyecto</p>
                                {isEditing ? (
                                    <input
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                        value={formData.zone_project || ""}
                                        onChange={(e) => handleChange('zone_project', e.target.value)}
                                    />
                                ) : (
                                    <p className="font-medium">{client.zone_project || "No especificado"}</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <Briefcase className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                            <div className="w-full">
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Interés</p>
                                {isEditing ? (
                                    <input
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                        value={formData.interest_category || ""}
                                        onChange={(e) => handleChange('interest_category', e.target.value)}
                                    />
                                ) : (
                                    <p className="font-medium">{client.interest_category || "No especificado"}</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <DollarSign className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                            <div className="w-full">
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Presupuesto</p>
                                {isEditing ? (
                                    <input
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                        value={formData.budget || ""}
                                        onChange={(e) => handleChange('budget', e.target.value)}
                                    />
                                ) : (
                                    <p className="font-medium">{client.budget ? `$${client.budget}` : "No definido"}</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <User className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                            <div className="w-full">
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Atiende</p>
                                {isEditing ? (
                                    <input
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                        value={formData.assigned_to || ""}
                                        onChange={(e) => handleChange('assigned_to', e.target.value)}
                                    />
                                ) : (
                                    <p className="font-medium">{client.assigned_to || "Sin asignar"}</p>
                                )}
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
                                {isEditing ? (
                                    <input
                                        type="date"
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                        value={formData.last_contact_date || ""}
                                        onChange={(e) => handleChange('last_contact_date', e.target.value)}
                                    />
                                ) : (
                                    <p>{client.last_contact_date || "-"}</p>
                                )}
                            </div>
                            <div>
                                <p className="text-white/50 mb-1">Próxima Acción</p>
                                {isEditing ? (
                                    <div className="flex flex-col gap-1">
                                        <input
                                            placeholder="Acción"
                                            className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                            value={formData.next_action || ""}
                                            onChange={(e) => handleChange('next_action', e.target.value)}
                                        />
                                        <input
                                            type="date"
                                            className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                            value={formData.next_action_date || ""}
                                            onChange={(e) => handleChange('next_action_date', e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-brand-gold/80 mb-1">{client.next_action || "Ninguna"}</p>
                                        <p className="text-brand-gold font-bold">{client.next_action_date || "Pendiente"}</p>
                                    </>
                                )}
                            </div>
                            <div>
                                <p className="text-white/50 mb-1">Viaje Estimado</p>
                                {isEditing ? (
                                    <input
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                        value={formData.estimated_travel_date || ""}
                                        onChange={(e) => handleChange('estimated_travel_date', e.target.value)}
                                    />
                                ) : (
                                    <p className="text-blue-300">{client.estimated_travel_date || "-"}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Notes */}
                    <div className="p-5 rounded-xl bg-brand-navy/50 border border-white/10">
                        <h3 className="text-sm font-bold text-white/90 mb-3 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Historial y Notas
                        </h3>
                        {isEditing ? (
                            <textarea
                                className="bg-black/30 border border-white/10 rounded px-3 py-2 w-full text-sm h-40 font-mono"
                                value={formData.detailed_notes || ""}
                                onChange={(e) => handleChange('detailed_notes', e.target.value)}
                            />
                        ) : (
                            <div className="prose prose-invert prose-sm max-w-none text-white/70 whitespace-pre-wrap font-light">
                                {client.detailed_notes || "No hay notas adicionales."}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/5 flex justify-end gap-2">
                    {isEditing && (
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-2 rounded-lg bg-transparent border border-white/10 text-white hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                    )}
                    <button
                        onClick={isEditing ? handleSave : onClose}
                        disabled={saving}
                        className={`px-6 py-2 rounded-lg font-bold transition-colors ${isEditing
                                ? 'bg-brand-gold text-brand-navy hover:bg-white'
                                : 'bg-white text-brand-navy hover:bg-gray-200'
                            }`}
                    >
                        {isEditing ? (saving ? "Guardando..." : "Guardar Cambios") : "Cerrar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
