import jsPDF from "jspdf";

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

// Helper to get proxied URL for external images
function getProxiedUrl(url: string): string {
    if (!url || url.startsWith('data:') || url.startsWith('blob:')) return url;
    // If it's an external URL, route through our proxy
    try {
        const parsed = new URL(url);
        if (parsed.origin !== window.location.origin) {
            return `/.netlify/functions/proxy-image?url=${encodeURIComponent(url)}`;
        }
    } catch { /* not a valid URL, return as-is */ }
    return url;
}

// Helper to load image with fallback
async function loadImageAsDataURL(url: string): Promise<string | null> {
    return new Promise((resolve) => {
        const img = new Image();
        const proxiedUrl = getProxiedUrl(url);
        // Only set crossOrigin if using proxy (same origin) or data URL
        if (proxiedUrl !== url || url.startsWith('data:')) {
            img.crossOrigin = "Anonymous";
        }

        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                // Usage of JPEG is generally safer for PDF size
                resolve(canvas.toDataURL("image/jpeg", 0.8));
            } catch (e) {
                console.error("Canvas export failed (likely CORS):", e);
                resolve(null);
            }
        };

        img.onerror = () => {
            console.error(`Failed to load image: ${url}`);
            resolve(null);
        };

        // Trigger load via proxy
        img.src = proxiedUrl;
    });
}

export async function generatePropertyPDF(
    propertyData: PropertyData,
    customImages: string[]
): Promise<Blob> {
    const doc = new jsPDF("landscape"); // PowerPoint style landscape
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const margin = 20;

    // NEW Color palette (Professional Sky/Slate/Gold)
    const colors = {
        primary: [15, 23, 42],       // Slate 900 (Dark background/text)
        secondary: [56, 189, 248],   // Sky 400 (Accents/Highlights)
        accent: [234, 179, 8],       // Yellow 500 (Gold/Luxury touches)
        bgLight: [241, 245, 249],    // Slate 100 (Light backgrounds)
        textDark: [51, 65, 85],      // Slate 700
        textLight: [148, 163, 184],  // Slate 400
        white: [255, 255, 255]
    };

    // Helper to sanitize text for jsPDF (removes emojis, replaces common special chars)
    const clean = (str: string | undefined) => {
        if (!str) return "";
        return str
            .replace(/[^\x00-\x7F]/g, (char) => {
                // Map common chars
                const map: Record<string, string> = {
                    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
                    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
                    'ñ': 'n', 'Ñ': 'N', '²': '2', '³': '3', '°': 'deg',
                    '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'"
                };
                return map[char] || ""; // Remove unknown
            })
            .trim();
    };

    // Sanitize Data
    const data = {
        ...propertyData,
        title: clean(propertyData.title),
        price: clean(propertyData.price),
        location: clean(propertyData.location),
        description: clean(propertyData.description),
        bedrooms: clean(propertyData.bedrooms),
        bathrooms: clean(propertyData.bathrooms),
        area: clean(propertyData.area),
        features: propertyData.features.map(clean)
    };

    // Helper for background
    const drawBackground = () => {
        doc.setFillColor(colors.bgLight[0], colors.bgLight[1], colors.bgLight[2]);
        doc.rect(0, 0, W, H, "F");

        // Subtle design element - bottom bar
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, H - 15, W, 15, "F");
    };

    // ========== SLIDE 1: TITLE SLIDE ==========
    drawBackground();

    // Hero image logic - prefer custom images, then property images
    const heroImage = customImages[0] || propertyData.images[0];

    if (heroImage) {
        const imgData = await loadImageAsDataURL(heroImage);
        if (imgData) {
            // Full width top image
            doc.addImage(imgData, "JPEG", 0, 0, W, H * 0.6, undefined, "FAST");

            // Gradient-like overlay for text readability check
            // (Simulated with semi-transparent rect if supported, else solid bar below)
            // jsPDF transparency is tricky without plugins, so we use a design box overlapping
        }
    }

    // Title Card (Floating)
    const cardW = W * 0.8;
    const cardH = 80;
    const cardX = (W - cardW) / 2;
    const cardY = H * 0.45;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "F");

    // Border
    doc.setDrawColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.setLineWidth(1);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, "S");



    // Text Content
    doc.setFont("helvetica", "bold");
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.setFontSize(26);

    const titleLines = doc.splitTextToSize(data.title.toUpperCase(), cardW - 20);
    doc.text(titleLines[0], W / 2, cardY + 25, { align: "center" });

    // Price
    doc.setFontSize(32);
    doc.setTextColor(colors.secondary[0], colors.secondary[1], colors.secondary[2]);
    doc.text(data.price, W / 2, cardY + 45, { align: "center" });

    // Location
    doc.setFontSize(14);
    doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
    doc.setFont("helvetica", "normal");
    doc.text(data.location, W / 2, cardY + 60, { align: "center" });

    // Footer Info
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text("PREPARED FOR YOU", margin, H - 5);
    doc.text("DO PANAMA REAL ESTATE", W - margin, H - 5, { align: "right" });


    // ========== SLIDE 2: DETAILS & SPECS ==========
    doc.addPage();
    drawBackground();

    // Header strip
    doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.rect(0, 0, W, 30, "F");

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.text("PROPERTY SPECIFICATIONS", margin, 20);

    let y = 50;

    // Icon Grid
    const specIcons = [
        { label: "BEDROOMS", val: data.bedrooms, icon: "Beds" },
        { label: "BATHROOMS", val: data.bathrooms, icon: "Baths" },
        { label: "LIVING AREA", val: data.area, icon: "Area" },
        { label: "LOCATION", val: data.location.split(",")[0], icon: "Loc" } // Short loc
    ].filter(i => i.val); // Only show existing data

    const cols = 2; // 2x2 grid for specs
    const colW = (W - margin * 3) / cols;

    specIcons.forEach((spec, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const boxX = margin + col * (colW + margin);
        const boxY = y + row * 45;
        const boxH = 35;

        // Card bg
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(boxX, boxY, colW, boxH, 2, 2, "F");

        // Icon
        doc.setFontSize(18);
        doc.text(spec.icon, boxX + 10, boxY + 22);

        // Value
        doc.setFontSize(16);
        doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.setFont("helvetica", "bold");
        doc.text(spec.val || "-", boxX + 30, boxY + 15);

        // Label
        doc.setFontSize(9);
        doc.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        doc.setFont("helvetica", "normal");
        doc.text(spec.label, boxX + 30, boxY + 28);
    });

    y += 100; // Move down below specs

    // Description Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("DESCRIPTION", margin, y);

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

    const descText = doc.splitTextToSize(data.description, W - margin * 2);
    // Limit lines to fit page
    const maxLines = 12;
    doc.text(descText.slice(0, maxLines), margin, y);

    if (descText.length > maxLines) {
        doc.text("...", margin, y + (maxLines * 5));
    }

    // ========== SLIDE 3: GALLERY ==========
    // Combine custom and scraped images
    const allImages = [...customImages, ...data.images];
    // Avoid re-using hero if it was index 0, but okay for gallery usually
    // Let's take up to 4 nicely laid out images

    if (allImages.length > 0) {
        doc.addPage();
        drawBackground();

        // Header
        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, W, 30, "F");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("PROPERTY GALLERY", margin, 20);

        // Mosaic Layout
        const galleryY = 45;
        const galleryH = H - 70; // Available height
        const gap = 5;

        // We try to fit 3-4 images
        const galleryImages = allImages.slice(0, 4);

        // Load all first
        const loadedImages = await Promise.all(galleryImages.map(url => loadImageAsDataURL(url)));
        const validImages = loadedImages.filter(Boolean) as string[];

        // Dynamic layout based on count
        if (validImages.length === 1) {
            doc.addImage(validImages[0], "JPEG", margin, galleryY, W - margin * 2, galleryH * 0.8, undefined, "FAST");
        } else if (validImages.length === 2) {
            // Side by side
            const w = (W - margin * 2 - gap) / 2;
            doc.addImage(validImages[0], "JPEG", margin, galleryY, w, galleryH * 0.6, undefined, "FAST");
            doc.addImage(validImages[1], "JPEG", margin + w + gap, galleryY, w, galleryH * 0.6, undefined, "FAST");
        } else if (validImages.length >= 3) {
            // 1 Big, 2 Small on right
            const mainW = (W - margin * 2) * 0.6;
            const sideW = (W - margin * 2) * 0.4 - gap;
            const sideH = (galleryH * 0.6 - gap) / 2;

            doc.addImage(validImages[0], "JPEG", margin, galleryY, mainW, galleryH * 0.6, undefined, "FAST");
            doc.addImage(validImages[1], "JPEG", margin + mainW + gap, galleryY, sideW, sideH, undefined, "FAST");
            if (validImages[2]) {
                doc.addImage(validImages[2], "JPEG", margin + mainW + gap, galleryY + sideH + gap, sideW, sideH, undefined, "FAST");
            }
        }
    }

    // ========== SLIDE 4: FEATURES LIST ==========
    if (data.features.length > 0) {
        doc.addPage();
        drawBackground();

        doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        doc.rect(0, 0, W, 30, "F");
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("AMENITIES & FEATURES", margin, 20);

        let y = 50;
        const colCount = 3;
        const colWidth = (W - margin * 2) / colCount;

        doc.setFontSize(11);
        doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

        data.features.forEach((feat, i) => {
            const col = i % colCount;
            const row = Math.floor(i / colCount);

            // Check page overflow
            if (y + row * 10 > H - 30) return;

            doc.text("- " + feat, margin + col * colWidth, y + row * 12);
        });
    }

    return doc.output("blob");
}
