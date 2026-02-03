"use client";

import { useState, useEffect } from "react";
import { X, Calendar, MapPin, DollarSign, User, Tag, Clock, Briefcase, Edit2, Save, Loader2, Trash2 } from "lucide-react";
import { type Client } from "@/types";
import { supabase } from "@/lib/supabaseClient";
import { BUYER_TYPES } from "@/lib/constants";

interface LeadDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    onClientUpdated?: (updatedClient: Client) => void;
    onClientCreated?: (newClient: Client) => void;
    lang?: 'es' | 'en';
}

export default function LeadDetailsModal({ isOpen, onClose, client, onClientUpdated, onClientCreated, lang = 'es' }: LeadDetailsModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Client>>({});
    const [saving, setSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const isNew = !client; // If no client passed, we are creating

    useEffect(() => {
        if (isOpen) {
            if (client) {
                setFormData(client);
                setIsEditing(false);
            } else {
                // Initialize default for new client
                setFormData({
                    status: 'Prospecto',
                    tag: 'Mirando',
                });
                setIsEditing(true); // Always editing if new
            }
        }
    }, [client, isOpen]);

    if (!isOpen) return null;

    const handleDelete = async () => {
        if (deleteInput !== "DELETE") return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('crm_clients')
                .delete()
                .eq('id', client!.id);

            if (error) throw error;

            // Notify system of deletion (refresh data)
            window.dispatchEvent(new CustomEvent('client-deleted', { detail: client!.id }));
            onClose();
        } catch (err: any) {
            console.error("Error deleting client:", err);
            alert(lang === 'es' ? `Error al eliminar: ${err.message}` : `Error deleting: ${err.message}`);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            if (isNew) {
                // CREATE - Provide a UUID from frontend because DB default might be missing
                const newId = crypto.randomUUID();
                const { data, error } = await supabase
                    .from('crm_clients')
                    .insert([{
                        id: newId,
                        full_name: formData.full_name,
                        status: formData.status,
                        tag: formData.tag,
                        budget: formData.budget,
                        zone_project: formData.zone_project,
                        interest_category: formData.interest_category,
                        assigned_to: formData.assigned_to,
                        last_contact_date: formData.last_contact_date,
                        next_action: formData.next_action,
                        next_action_date: formData.next_action_date,
                        estimated_travel_date: formData.estimated_travel_date,
                        detailed_notes: formData.detailed_notes
                    }])
                    .select()
                    .single();

                if (error) throw error;
                if (onClientCreated && data) onClientCreated(data as Client);
                onClose();
            } else {
                // UPDATE
                const { error } = await supabase
                    .from('crm_clients')
                    .update({
                        full_name: formData.full_name,
                        status: formData.status,
                        tag: formData.tag,
                        budget: formData.budget,
                        zone_project: formData.zone_project,
                        interest_category: formData.interest_category,
                        assigned_to: formData.assigned_to,
                        last_contact_date: formData.last_contact_date,
                        next_action: formData.next_action,
                        next_action_date: formData.next_action_date,
                        estimated_travel_date: formData.estimated_travel_date,
                        detailed_notes: formData.detailed_notes
                    })
                    .eq('id', client!.id);

                if (error) throw error;
                if (onClientUpdated) onClientUpdated({ ...client, ...formData } as Client);
                setIsEditing(false);
            }
        } catch (err: any) {
            console.error("Error saving client:", err);
            alert(lang === 'es' ? `Error al guardar: ${err.message}` : `Error saving: ${err.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof Client, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content - Mobile Fullscreen, Desktop Centered */}
            <div className="relative w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] bg-[#0f1014]/90 border border-white/10 sm:rounded-2xl shadow-2xl overflow-hidden glass-card animate-in fade-in zoom-in-95 duration-200 flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-start p-4 md:p-6 border-b border-white/5 bg-white/5">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            {isEditing ? (
                                <input
                                    className="bg-white/10 border border-white/20 rounded px-2 py-1 text-lg md:text-2xl font-bold text-white font-heading w-full placeholder:text-white/30"
                                    value={formData.full_name || ""}
                                    onChange={(e) => handleChange('full_name', e.target.value)}
                                    placeholder={lang === 'es' ? "Nombre del Cliente..." : "Client Name..."}
                                    autoFocus
                                />
                            ) : (
                                <h2 className="text-2xl font-bold text-white font-heading">{client?.full_name}</h2>
                            )}

                            {isEditing ? (
                                <select
                                    className="bg-black/50 border border-white/20 rounded px-2 py-1 text-xs font-bold w-32"
                                    value={formData.tag || ""}
                                    onChange={(e) => handleChange('tag', e.target.value)}
                                >
                                    <option value="Hot">🔥 Hot</option>
                                    <option value="Mirando">👀 Mirando</option>
                                    <option value="Frío">❄️ Frío</option>
                                    <option value="Sospechoso">⚠️ Sospechoso</option>
                                    <option value="Caótico">🧨 Caótico</option>
                                    <option value="Dormido">💤 Dormido</option>
                                    <option value="Cierre">Cierre</option>
                                </select>
                            ) : (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${client?.tag?.includes("Hot") ? "bg-brand-gold text-brand-navy" : "bg-white/10 text-white"}`}>
                                    {client?.tag || "Sin etiqueta"}
                                </span>
                            )}
                        </div>
                        <p className="text-white/60 text-sm flex items-center gap-2">
                            <span className="font-mono text-xs opacity-50">{isNew ? 'NEW' : client?.id?.slice(0, 8)}</span>
                            <span>•</span>
                            {isEditing ? (
                                <select
                                    className="bg-black/50 border border-white/20 rounded px-2 py-1 text-xs text-brand-gold"
                                    value={formData.status || ""}
                                    onChange={(e) => handleChange('status', e.target.value)}
                                >
                                    <option value="🟢 En seguimiento">En seguimiento</option>
                                    <option value="🟠 Pendiente respuesta">{lang === 'es' ? 'Pendiente respuesta' : 'Pending Reply'}</option>
                                    <option value="🔴 No seguimiento">{lang === 'es' ? 'No seguimiento' : 'No Follow Up'}</option>
                                    <option value="Cliente activo">{lang === 'es' ? 'Cliente activo' : 'Active Client'}</option>
                                    <option value="Cerrando">{lang === 'es' ? 'Cerrando' : 'Closing Process'}</option>
                                    <option value="Cerrado">{lang === 'es' ? 'Cerrado' : 'Closed / Won'}</option>
                                    <option value="Prospecto">{lang === 'es' ? 'Prospecto' : 'Prospect'}</option>
                                </select>
                            ) : (
                                <span className="text-brand-gold/80">{client?.status}</span>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {!isEditing && !isNew ? (
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

                {/* Body - Flex grow to push footer down */}
                <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-6">

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
                                    <p className="font-medium">{client?.zone_project || "No especificado"}</p>
                                )}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-start gap-3">
                            <Briefcase className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />

                            <div className="w-full">
                                <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Buyer Persona / Interés</p>
                                {isEditing ? (
                                    <input
                                        className="bg-black/30 border border-white/10 rounded px-2 py-1 w-full text-sm"
                                        value={formData.interest_category || ""}
                                        onChange={(e) => handleChange('interest_category', e.target.value)}
                                    />
                                ) : (
                                    <div>
                                        {(() => {
                                            const buyerType = BUYER_TYPES.find(t => t.id === client?.interest_category);
                                            if (buyerType) {
                                                return (
                                                    <div>
                                                        <p className="font-bold text-brand-gold">{buyerType.label}</p>
                                                        <p className="text-xs text-white/60">{buyerType.description}</p>
                                                    </div>
                                                );
                                            }
                                            return <p className="font-medium">{client?.interest_category || "No especificado"}</p>;
                                        })()}
                                    </div>
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
                                    <p className="font-medium">{client?.budget ? `$${client.budget}` : "No definido"}</p>
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
                                    <p className="font-medium">{client?.assigned_to || "Sin asignar"}</p>
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
                                    <p>{client?.last_contact_date || "-"}</p>
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
                                        <p className="text-brand-gold/80 mb-1">{client?.next_action || "Ninguna"}</p>
                                        <p className="text-brand-gold font-bold">{client?.next_action_date || "Pendiente"}</p>
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
                                    <p className="text-blue-300">{client?.estimated_travel_date || "-"}</p>
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
                                {client?.detailed_notes || "No hay notas adicionales."}
                            </div>
                        )}
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-white/5 flex flex-col sm:flex-row justify-between gap-3">
                    <div className="flex gap-2 order-2 sm:order-1">
                        {!isNew && !isEditing && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="px-4 py-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors text-sm font-medium border border-red-400/20 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {lang === 'es' ? 'Eliminar' : 'Delete'}
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 order-1 sm:order-2">
                        {isEditing && (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-6 py-2 rounded-lg bg-transparent border border-white/10 text-white hover:bg-white/5 transition-colors flex-1 sm:flex-none"
                            >
                                {lang === 'es' ? 'Cancelar' : 'Cancel'}
                            </button>
                        )}
                        <button
                            onClick={isEditing ? handleSave : onClose}
                            disabled={saving}
                            className={`px-6 py-2 rounded-lg font-bold transition-colors flex-1 sm:flex-none ${isEditing
                                ? 'bg-brand-gold text-brand-navy hover:bg-white'
                                : 'bg-white text-brand-navy hover:bg-gray-200'
                                }`}
                        >
                            {isEditing ? (saving ? (lang === 'es' ? "Guardando..." : "Saving...") : (lang === 'es' ? "Guardar" : "Save")) : (lang === 'es' ? "Cerrar" : "Close")}
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Sub-modal */}
                {showDeleteConfirm && (
                    <div className="absolute inset-0 z-[60] bg-black/95 flex items-center justify-center p-6 animate-in fade-in">
                        <div className="glass-card p-8 border-red-500/30 max-w-sm w-full text-center">
                            <h3 className="text-xl font-bold text-red-500 mb-4">{lang === 'es' ? '¿Confirmar eliminación?' : 'Confirm Deletion?'}</h3>
                            <p className="text-white/70 text-sm mb-6">
                                {lang === 'es'
                                    ? `Esta acción es permanente. Por favor escribe "DELETE" para confirmar la eliminación de ${client?.full_name}.`
                                    : `This action is permanent. Please type "DELETE" to confirm the deletion of ${client?.full_name}.`
                                }
                            </p>
                            <input
                                type="text"
                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-center font-mono text-white mb-6 focus:border-red-500 outline-none"
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.target.value)}
                                placeholder="DELETE"
                                autoFocus
                            />
                            <div className="flex gap-4">
                                <button
                                    onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                                >
                                    {lang === 'es' ? 'Cancelar' : 'Cancel'}
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleteInput !== "DELETE" || isDeleting}
                                    className="flex-1 py-3 bg-red-500 text-white rounded-xl disabled:opacity-30 disabled:grayscale transition-all hover:bg-red-600 font-bold"
                                >
                                    {isDeleting ? "..." : (lang === 'es' ? 'Borrar' : 'Delete')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
