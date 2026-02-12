"use client";

import { useState } from "react";
import { Image as ImageIcon, Plus, Trash2, Check, X, Link as LinkIcon } from "lucide-react";

interface ImageManagerProps {
    images: string[];
    onUpdate: (newImages: string[]) => void;
    onClose: () => void;
}

export default function ImageManager({ images, onUpdate, onClose }: ImageManagerProps) {
    const [selectedImages, setSelectedImages] = useState<string[]>([...images]);
    const [newImageUrl, setNewImageUrl] = useState("");

    const toggleImageSelection = (img: string) => {
        setSelectedImages(prev =>
            prev.includes(img)
                ? prev.filter(i => i !== img)
                : [...prev, img]
        );
    };

    const removeImage = (img: string) => {
        setSelectedImages(prev => prev.filter(i => i !== img));
    };

    const addImageUrl = () => {
        if (newImageUrl.trim() && isValidUrl(newImageUrl)) {
            setSelectedImages(prev => [...prev, newImageUrl.trim()]);
            setNewImageUrl("");
        } else {
            alert('⚠️ Please enter a valid image URL');
        }
    };

    const isValidUrl = (url: string): boolean => {
        try {
            new URL(url);
            return url.startsWith('http://') || url.startsWith('https://');
        } catch {
            return false;
        }
    };

    const handleSave = () => {
        if (selectedImages.length === 0) {
            alert('⚠️ At least one image is required for the presentation.');
            return;
        }
        onUpdate(selectedImages);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ImageIcon className="w-6 h-6" />
                            <div>
                                <h2 className="text-2xl font-bold">Manage Property Images</h2>
                                <p className="text-sm text-white/80 mt-1">
                                    {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
                                </p>
                            </div>
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
                    {/* Image Grid */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Property Images</h3>
                        {images.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-500">No images extracted yet</p>
                                <p className="text-sm text-gray-400 mt-1">Add images using the form below</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        className={`relative group rounded-lg overflow-hidden border-4 transition-all cursor-pointer ${selectedImages.includes(img)
                                                ? 'border-green-500 shadow-lg'
                                                : 'border-gray-200 hover:border-gray-400'
                                            }`}
                                        onClick={() => toggleImageSelection(img)}
                                    >
                                        <img
                                            src={img}
                                            alt={`Property ${idx + 1}`}
                                            className="w-full h-40 object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage Error%3C/text%3E%3C/svg%3E';
                                            }}
                                        />

                                        {/* Selection Indicator */}
                                        <div className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${selectedImages.includes(img)
                                                ? 'bg-green-500 scale-100'
                                                : 'bg-white/80 scale-0 group-hover:scale-100'
                                            }`}>
                                            {selectedImages.includes(img) && (
                                                <Check className="w-4 h-4 text-white" />
                                            )}
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeImage(img);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        {/* Image Number */}
                                        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                                            #{idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Image by URL */}
                    <div className="border-t-2 border-gray-200 pt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Images</h3>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="url"
                                    value={newImageUrl}
                                    onChange={(e) => setNewImageUrl(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && addImageUrl()}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 focus:outline-none transition-colors"
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                            <button
                                onClick={addImageUrl}
                                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 font-semibold"
                            >
                                <Plus className="w-5 h-5" />
                                Add URL
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            💡 Tip: Click on images to select/deselect them. Only selected images will be included in the presentation.
                        </p>
                    </div>

                    {/* Selection Summary */}
                    {images.length > 0 && (
                        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold text-blue-900">
                                        {selectedImages.length} of {images.length} images selected
                                    </p>
                                    <p className="text-sm text-blue-700 mt-1">
                                        {selectedImages.length === 0 && '⚠️ Select at least one image to continue'}
                                        {selectedImages.length > 0 && selectedImages.length < images.length && 'Some images will be excluded from the presentation'}
                                        {selectedImages.length === images.length && '✓ All images will be included'}
                                    </p>
                                </div>
                                {selectedImages.length < images.length && (
                                    <button
                                        onClick={() => setSelectedImages([...images])}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-semibold"
                                    >
                                        Select All
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
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
                        disabled={selectedImages.length === 0}
                        className={`flex-1 px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${selectedImages.length === 0
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                            }`}
                    >
                        <Check className="w-5 h-5" />
                        Save Selection ({selectedImages.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
