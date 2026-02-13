"use client";

import { useState, useEffect } from "react";
import { PropertyData } from "@/types";
import { Edit2, Plus, Trash2, MapPin, DollarSign, Home, Maximize } from "lucide-react";
import Image from "next/image";

interface PresentationViewProps {
    data: PropertyData;
    isEditing: boolean;
    onSave: (updatedData: PropertyData) => void;
}

export default function PresentationView({ data, isEditing, onSave }: PresentationViewProps) {
    const [editedData, setEditedData] = useState<PropertyData>(data);
    const [newFeature, setNewFeature] = useState("");

    // Update editedData when data prop changes
    useEffect(() => {
        setEditedData(data);
    }, [data]);

    // Auto-save with debounce
    useEffect(() => {
        if (!isEditing) return;

        const timer = setTimeout(() => {
            // Only save if data has actually changed
            if (JSON.stringify(editedData) !== JSON.stringify(data)) {
                console.log("Auto-saving changes...");
                onSave(editedData);
            }
        }, 1500); // Save 1.5 seconds after last edit

        return () => clearTimeout(timer);
    }, [editedData, isEditing, onSave, data]);

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

    const removeImage = (index: number) => {
        setEditedData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="relative h-[70vh] min-h-[500px]">
                {editedData.images && editedData.images.length > 0 ? (
                    <div className="relative w-full h-full">
                        <img
                            src={editedData.images[0]}
                            alt={editedData.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    </div>
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <p className="text-white/40">No image available</p>
                    </div>
                )}

                {/* Title & Price Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                    <div className="max-w-4xl">
                        {/* Title */}
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedData.title}
                                onChange={(e) => updateField('title', e.target.value)}
                                className="w-full text-4xl md:text-6xl font-bold text-white bg-white/10 backdrop-blur-sm border-2 border-white/30 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-brand-gold"
                                placeholder="Property Title"
                            />
                        ) : (
                            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
                                {editedData.title}
                            </h1>
                        )}

                        {/* Price */}
                        <div className="flex items-center gap-3">
                            <DollarSign className="w-8 h-8 text-brand-gold" />
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedData.price}
                                    onChange={(e) => updateField('price', e.target.value)}
                                    className="text-3xl md:text-4xl font-bold text-brand-gold bg-white/10 backdrop-blur-sm border-2 border-brand-gold/30 rounded-lg px-4 py-2 focus:outline-none focus:border-brand-gold"
                                    placeholder="$000,000"
                                />
                            ) : (
                                <span className="text-3xl md:text-4xl font-bold text-brand-gold">
                                    {editedData.price}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Property Details */}
            <div className="bg-white px-8 md:px-12 py-12">
                <div className="max-w-4xl mx-auto space-y-12">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {/* Location */}
                        <div className="col-span-2">
                            <div className="flex items-center gap-2 text-gray-500 mb-2">
                                <MapPin className="w-5 h-5" />
                                <span className="text-sm font-semibold">Location</span>
                            </div>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editedData.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    className="w-full text-lg font-semibold text-gray-900 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    placeholder="City, Country"
                                />
                            ) : (
                                <p className="text-lg font-semibold text-gray-900">{editedData.location}</p>
                            )}
                        </div>

                        {/* Bedrooms */}
                        {editedData.bedrooms && (
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-2">
                                    <Home className="w-5 h-5" />
                                    <span className="text-sm font-semibold">Bedrooms</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedData.bedrooms}
                                        onChange={(e) => updateField('bedrooms', e.target.value)}
                                        className="w-full text-lg font-semibold text-gray-900 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-gray-900">{editedData.bedrooms}</p>
                                )}
                            </div>
                        )}

                        {/* Bathrooms */}
                        {editedData.bathrooms && (
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-2">
                                    <Home className="w-5 h-5" />
                                    <span className="text-sm font-semibold">Bathrooms</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedData.bathrooms}
                                        onChange={(e) => updateField('bathrooms', e.target.value)}
                                        className="w-full text-lg font-semibold text-gray-900 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-gray-900">{editedData.bathrooms}</p>
                                )}
                            </div>
                        )}

                        {/* Area */}
                        {editedData.area && (
                            <div>
                                <div className="flex items-center gap-2 text-gray-500 mb-2">
                                    <Maximize className="w-5 h-5" />
                                    <span className="text-sm font-semibold">Area</span>
                                </div>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedData.area}
                                        onChange={(e) => updateField('area', e.target.value)}
                                        className="w-full text-lg font-semibold text-gray-900 border-2 border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                                    />
                                ) : (
                                    <p className="text-lg font-semibold text-gray-900">{editedData.area}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
                        {isEditing ? (
                            <textarea
                                value={editedData.description}
                                onChange={(e) => updateField('description', e.target.value)}
                                rows={8}
                                className="w-full text-gray-700 leading-relaxed border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 resize-none"
                                placeholder="Property description..."
                            />
                        ) : (
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{editedData.description}</p>
                        )}
                    </div>

                    {/* Features */}
                    {(editedData.features && editedData.features.length > 0) || isEditing ? (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Features & Amenities</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {editedData.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-3">
                                        {isEditing ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={feature}
                                                    onChange={(e) => updateFeature(idx, e.target.value)}
                                                    className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                                                />
                                                <button
                                                    onClick={() => removeFeature(idx)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-2 h-2 bg-brand-gold rounded-full" />
                                                <span className="text-gray-700">{feature}</span>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {isEditing && (
                                <div className="mt-4 flex gap-2">
                                    <input
                                        type="text"
                                        value={newFeature}
                                        onChange={(e) => setNewFeature(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
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
                            )}
                        </div>
                    ) : null}

                    {/* Image Gallery */}
                    {editedData.images && editedData.images.length > 1 && (
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Gallery</h2>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {editedData.images.slice(1).map((img, idx) => (
                                    <div key={idx} className="relative aspect-video group">
                                        <img
                                            src={img}
                                            alt={`Property ${idx + 2}`}
                                            className="w-full h-full object-cover rounded-lg"
                                        />
                                        {isEditing && (
                                            <button
                                                onClick={() => removeImage(idx + 1)}
                                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
