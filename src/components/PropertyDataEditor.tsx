"use client";

import { useState } from "react";
import { Edit2, Plus, Trash2, Check, X } from "lucide-react";

interface PropertyData {
    title: string;
    price: string;
    location: string;
    bedrooms?: string;
    bathrooms?: string;
    area?: string;
    description: string;
    features: string[];
    images: string[];
    source: string;
}

interface PropertyDataEditorProps {
    data: PropertyData;
    onUpdate: (updatedData: PropertyData) => void;
    onClose: () => void;
}

export default function PropertyDataEditor({ data, onUpdate, onClose }: PropertyDataEditorProps) {
    const [editedData, setEditedData] = useState<PropertyData>({ ...data });
    const [newFeature, setNewFeature] = useState("");

    const updateField = (field: keyof PropertyData, value: any) => {
        setEditedData(prev => ({ ...prev, [field]: value }));
    };

    const addFeature = () => {
        if (newFeature.trim()) {
            setEditedData(prev => ({
                ...prev,
                features: [...prev.features, newFeature.trim()]
            }));
            setNewFeature("");
        }
    };

    const removeFeature = (index: number) => {
        setEditedData(prev => ({
            ...prev,
            features: prev.features.filter((_, i) => i !== index)
        }));
    };

    const updateFeature = (index: number, value: string) => {
        setEditedData(prev => ({
            ...prev,
            features: prev.features.map((f, i) => i === index ? value : f)
        }));
    };

    const handleSave = () => {
        // Validate area is present
        if (!editedData.area || editedData.area.trim() === '') {
            alert('⚠️ Area is required. Please add the property area.');
            return;
        }
        onUpdate(editedData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Edit2 className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Edit Property Data</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Title
                        </label>
                        <input
                            type="text"
                            value={editedData.title}
                            onChange={(e) => updateField('title', e.target.value)}
                            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                            placeholder="Property title"
                        />
                    </div>

                    {/* Price & Location */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Price
                            </label>
                            <input
                                type="text"
                                value={editedData.price}
                                onChange={(e) => updateField('price', e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="$250,000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                value={editedData.location}
                                onChange={(e) => updateField('location', e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="Panama City, Panama"
                            />
                        </div>
                    </div>

                    {/* Area (MANDATORY) */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Area <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={editedData.area || ''}
                            onChange={(e) => updateField('area', e.target.value)}
                            required
                            className="w-full border-2 border-red-200 rounded-lg px-4 py-3 focus:border-red-500 focus:outline-none transition-colors"
                            placeholder="150 m² or 1,615 sq ft"
                        />
                        <p className="text-xs text-red-600 mt-1">* Required field</p>
                    </div>

                    {/* Bedrooms & Bathrooms */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Bedrooms
                            </label>
                            <input
                                type="text"
                                value={editedData.bedrooms || ''}
                                onChange={(e) => updateField('bedrooms', e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="3 bedrooms"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Bathrooms
                            </label>
                            <input
                                type="text"
                                value={editedData.bathrooms || ''}
                                onChange={(e) => updateField('bathrooms', e.target.value)}
                                className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="2 bathrooms"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            value={editedData.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            rows={6}
                            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                            placeholder="Property description..."
                        />
                    </div>

                    {/* Features */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Features
                        </label>
                        <div className="space-y-2 mb-3">
                            {editedData.features.map((feature, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input
                                        type="text"
                                        value={feature}
                                        onChange={(e) => updateFeature(idx, e.target.value)}
                                        className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                    <button
                                        onClick={() => removeFeature(idx)}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add new feature */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newFeature}
                                onChange={(e) => setNewFeature(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                                className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none transition-colors"
                                placeholder="Add new feature..."
                            />
                            <button
                                onClick={addFeature}
                                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-gray-50 p-6 rounded-b-2xl border-t-2 border-gray-200 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
