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
            resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = reject;
        img.src = url;
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

    // Color palette (soft, professional)
    const colors = {
        primary: [0, 150, 136],      // Teal
        secondary: [0, 188, 212],    // Light teal
        accent: [255, 193, 7],       // Amber
        dark: [30, 41, 59],          // Slate
        light: [248, 250, 252],      // Very light blue
        white: [255, 255, 255]
    };

    // ========== SLIDE 1: TITLE SLIDE ==========
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, W, H, "F");

    // Hero image if available
    if (customImages[0]) {
        try {
            const imgData = await loadImageAsDataURL(customImages[0]);
            doc.addImage(imgData, "JPEG", 0, 0, W, H * 0.55, undefined, "FAST");

            // Gradient overlay effect (simulated with rectangles)
            doc.setFillColor(255, 255, 255);
            doc.setGState(doc.GState({ opacity: 0.3 }));
            doc.rect(0, H * 0.4, W, H * 0.15, "F");
            doc.setGState(doc.GState({ opacity: 1 }));
        } catch (e) {
            console.error("Hero image failed:", e);
        }
    }

    // Title box (centered, professional)
    const titleBoxY = H * 0.5;
    const titleBoxH = 50;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin * 2, titleBoxY, W - margin * 4, titleBoxH, 3, 3, "F");
    doc.setDrawColor(0, 150, 136);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin * 2, titleBoxY, W - margin * 4, titleBoxH, 3, 3, "S");

    // Property title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59);
    const titleLines = doc.splitTextToSize(propertyData.title, W - margin * 6);
    doc.text(titleLines[0], W / 2, titleBoxY + 15, { align: "center" });

    // Price (prominent)
    doc.setFontSize(28);
    doc.setTextColor(0, 150, 136);
    doc.text(propertyData.price, W / 2, titleBoxY + 32, { align: "center" });

    // Location
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.text("📍 " + propertyData.location, W / 2, titleBoxY + 44, { align: "center" });

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Property Presentation", margin, H - 10);
    doc.text(propertyData.source, W - margin, H - 10, { align: "right" });

    // ========== SLIDE 2: KEY DETAILS ==========
    doc.addPage();
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, W, H, "F");

    // Slide title
    doc.setFillColor(0, 150, 136);
    doc.rect(0, 0, W, 25, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("PROPERTY DETAILS", margin, 16);

    let y = 45;

    // Stats cards (3 columns)
    const cardW = (W - margin * 2 - 20) / 3;
    const cardH = 35;
    const cardY = y;

    const drawStatCard = (x: number, icon: string, label: string, value: string) => {
        if (!value) return;

        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, "F");
        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, cardY, cardW, cardH, 2, 2, "S");

        doc.setFontSize(18);
        doc.text(icon, x + cardW / 2, cardY + 12, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 150, 136);
        doc.text(value, x + cardW / 2, cardY + 22, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(label, x + cardW / 2, cardY + 30, { align: "center" });
    };

    if (propertyData.bedrooms) drawStatCard(margin, "🛏️", "BEDROOMS", propertyData.bedrooms);
    if (propertyData.bathrooms) drawStatCard(margin + cardW + 10, "🚿", "BATHROOMS", propertyData.bathrooms);
    if (propertyData.area) drawStatCard(margin + (cardW + 10) * 2, "📐", "AREA", propertyData.area);

    y += cardH + 20;

    // Description box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 150, 136);
    doc.text("DESCRIPTION", margin, y);
    y += 10;

    doc.setFillColor(255, 255, 255);
    const descLines = doc.splitTextToSize(propertyData.description, W - margin * 2 - 20);
    const descH = Math.min(descLines.length * 5 + 15, 50);
    doc.roundedRect(margin, y, W - margin * 2, descH, 2, 2, "F");
    doc.setDrawColor(0, 188, 212);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, y, W - margin * 2, descH, 2, 2, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines.slice(0, 8), margin + 10, y + 8);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Property Presentation", margin, H - 10);
    doc.text("Page 2", W - margin, H - 10, { align: "right" });

    // ========== SLIDE 3: FEATURES ==========
    if (propertyData.features.length > 0) {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, W, H, "F");

        // Slide title
        doc.setFillColor(0, 150, 136);
        doc.rect(0, 0, W, 25, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("KEY FEATURES & AMENITIES", margin, 16);

        y = 45;

        // Features in 3 columns
        const cols = 3;
        const colW = (W - margin * 2 - 20) / cols;
        const features = propertyData.features.slice(0, 18);
        const rows = Math.ceil(features.length / cols);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        features.forEach((feature, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x = margin + col * (colW + 10);
            const fy = y + row * 12;

            doc.setTextColor(0, 150, 136);
            doc.text("●", x, fy);
            doc.setTextColor(30, 41, 59);
            doc.text(feature.substring(0, 35), x + 6, fy);
        });

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Property Presentation", margin, H - 10);
        doc.text("Page 3", W - margin, H - 10, { align: "right" });
    }

    // ========== SLIDE 4+: PHOTO GALLERY ==========
    if (customImages.length > 1) {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, W, H, "F");

        // Slide title
        doc.setFillColor(0, 150, 136);
        doc.rect(0, 0, W, 25, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text("PROPERTY GALLERY", margin, 16);

        // 2x2 grid of images
        const imgW = (W - margin * 2 - 15) / 2;
        const imgH = (H - 50) / 2;
        let imgX = margin;
        let imgY = 35;
        let imgCount = 0;

        for (let i = 1; i < customImages.length && i < 9; i++) {
            try {
                const imgData = await loadImageAsDataURL(customImages[i]);
                doc.addImage(imgData, "JPEG", imgX, imgY, imgW, imgH, undefined, "FAST");
                doc.setDrawColor(0, 188, 212);
                doc.setLineWidth(0.5);
                doc.roundedRect(imgX, imgY, imgW, imgH, 2, 2, "S");

                imgCount++;
                imgX += imgW + 15;

                if (imgCount % 2 === 0) {
                    imgX = margin;
                    imgY += imgH + 10;
                }

                if (imgCount % 4 === 0 && i < customImages.length - 1) {
                    // New page for more images
                    doc.addPage();
                    doc.setFillColor(248, 250, 252);
                    doc.rect(0, 0, W, H, "F");

                    doc.setFillColor(0, 150, 136);
                    doc.rect(0, 0, W, 25, "F");
                    doc.setFont("helvetica", "bold");
                    doc.setFontSize(20);
                    doc.setTextColor(255, 255, 255);
                    doc.text("PROPERTY GALLERY (CONTINUED)", margin, 16);

                    imgX = margin;
                    imgY = 35;
                }
            } catch (e) {
                console.error(`Image ${i} failed:`, e);
            }
        }

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text("Property Presentation", margin, H - 10);
        doc.text(`Page ${doc.getNumberOfPages()}`, W - margin, H - 10, { align: "right" });
    }

    return doc.output("blob");
}
