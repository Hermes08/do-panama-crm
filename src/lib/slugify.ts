// Utility to generate URL-friendly slug from property title
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .substring(0, 50) // Limit length
        + '-' + Math.random().toString(36).substring(2, 8); // Add random suffix
}

// Example: "Luxury Penthouse in Punta Pacifica" -> "luxury-penthouse-in-punta-pacifica-a3b8d1"
