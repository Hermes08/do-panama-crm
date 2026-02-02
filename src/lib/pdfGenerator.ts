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

async function loadImageAsDataURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = url;
    });
}

export async function generatePropertyPDF(
    propertyData: PropertyData,
    customImages: string[]
): Promise<Blob> {
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // ========== PAGE 1: HERO + ESSENTIALS ==========
    // Soft gradient background
    doc.setFillColor(245, 250, 255);
    doc.rect(0, 0, W, H, "F");

    // Hero image (full bleed top 60%)
    const heroImg = customImages[0] || propertyData.images[0];
    if (heroImg) {
        try {
            const imgData = await loadImageAsDataURL(heroImg);
            doc.addImage(imgData, "JPEG", 0, 0, W, H * 0.6, undefined, "FAST");
        } catch (e) {
            console.error("Hero image failed:", e);
        }
    }

    // Glass card for property info
    const cardY = H * 0.55;
    const cardH = 65;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, cardY, W - 30, cardH, 4, 4, "F");

    doc.setDrawColor(0, 188, 212);
    doc.setLineWidth(0.4);
    doc.roundedRect(15, cardY, W - 30, cardH, 4, 4, "S");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    const titleLines = doc.splitTextToSize(propertyData.title, W - 40);
    doc.text(titleLines[0], W / 2, cardY + 12, { align: "center" });

    // Price
    doc.setFontSize(22);
    doc.setTextColor(0, 150, 136);
    doc.text(propertyData.price, W / 2, cardY + 28, { align: "center" });

    // Location
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text("📍 " + propertyData.location, W / 2, cardY + 38, { align: "center" });

    // Key stats (3 pills)
    const statsY = cardY + 50;
    const pillW = 48;
    const gap = 4;
    const startX = (W - (pillW * 3 + gap * 2)) / 2;

    const drawPill = (x: number, icon: string, val: string) => {
        if (!val) return;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, statsY, pillW, 14, 2, 2, "F");
        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, statsY, pillW, 14, 2, 2, "S");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(icon + " " + val, x + pillW / 2, statsY + 9, { align: "center" });
    };

    if (propertyData.bedrooms) drawPill(startX, "🛏️", propertyData.bedrooms);
    if (propertyData.bathrooms) drawPill(startX + pillW + gap, "🚿", propertyData.bathrooms);
    if (propertyData.area) drawPill(startX + (pillW + gap) * 2, "📐", propertyData.area);

    // Source
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(propertyData.source, W / 2, H - 8, { align: "center" });

    // ========== PAGE 2: DESCRIPTION + FEATURES ==========
    doc.addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, W, H, "F");

    let y = 20;

    // Description section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 150, 136);
    doc.text("ABOUT THIS PROPERTY", 15, y);
    y += 10;

    doc.setFillColor(255, 255, 255);
    const descLines = doc.splitTextToSize(propertyData.description, W - 40);
    const descH = Math.min(descLines.length * 5 + 12, 50);
    doc.roundedRect(15, y - 5, W - 30, descH, 3, 3, "F");
    doc.setDrawColor(0, 188, 212);
    doc.setLineWidth(0.2);
    doc.roundedRect(15, y - 5, W - 30, descH, 3, 3, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(descLines.slice(0, 8), 20, y);
    y += descH + 8;

    // Features
    if (propertyData.features.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 150, 136);
        doc.text("KEY FEATURES", 15, y);
        y += 10;

        const feats = propertyData.features.slice(0, 10);
        const cols = 2;
        const colW = (W - 40) / cols;
        const rows = Math.ceil(feats.length / cols);
        const gridH = rows * 8 + 10;

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, y - 5, W - 30, gridH, 3, 3, "F");
        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.2);
        doc.roundedRect(15, y - 5, W - 30, gridH, 3, 3, "S");

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        feats.forEach((f, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = 20 + col * colW;
            const fy = y + row * 8;
            doc.setTextColor(0, 150, 136);
            doc.text("●", x, fy);
            doc.setTextColor(51, 65, 85);
            doc.text(f.substring(0, 30), x + 5, fy);
        });
        y += gridH + 8;
    }

    // Property details table (minimal)
    if (y < H - 60) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 150, 136);
        doc.text("DETAILS", 15, y);
        y += 8;

        const details = [
            ["Bedrooms", propertyData.bedrooms || "—"],
            ["Bathrooms", propertyData.bathrooms || "—"],
            ["Area", propertyData.area || "—"],
            ["Location", propertyData.location],
            ["Price", propertyData.price]
        ];

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        details.forEach((d, i) => {
            const rowY = y + i * 7;
            doc.setTextColor(100, 116, 139);
            doc.text(d[0], 20, rowY);
            doc.setTextColor(30, 41, 59);
            doc.text(d[1], W - 20, rowY, { align: "right" });
        });
    }

    // ========== PAGE 3: PHOTO GALLERY ==========
    const allImgs = [...customImages, ...propertyData.images].slice(0, 9);
    if (allImgs.length > 1) {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, W, H, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 150, 136);
        doc.text("GALLERY", 15, 18);

        const imgW = (W - 45) / 2;
        const imgH = imgW * 0.7;
        let imgX = 15;
        let imgY = 28;

        for (let i = 1; i < allImgs.length && i < 9; i++) {
            try {
                const imgData = await loadImageAsDataURL(allImgs[i]);
                doc.addImage(imgData, "JPEG", imgX, imgY, imgW, imgH, undefined, "FAST");
                doc.setDrawColor(0, 188, 212);
                doc.setLineWidth(0.3);
                doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "S");

                imgX += imgW + 15;
                if (imgX > W - imgW - 15) {
                    imgX = 15;
                    imgY += imgH + 15;
                    if (imgY > H - imgH - 20) {
                        doc.addPage();
                        doc.setFillColor(248, 250, 252);
                        doc.rect(0, 0, W, H, "F");
                        imgY = 20;
                    }
                }
            } catch (e) {
                console.error(`Image ${i} failed:`, e);
            }
        }
    }

    return doc.output("blob");
}
