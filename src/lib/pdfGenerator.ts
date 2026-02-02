import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

// Helper to load image as data URL
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
            resolve(canvas.toDataURL("image/jpeg", 0.8));
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
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // ==================== PAGE 1: PREMIUM COVER WITH LIGHT COLORS ====================
    // Soft gradient background (light blue to white)
    doc.setFillColor(240, 248, 255); // Alice Blue
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Add hero image with soft overlay
    const heroImage = customImages[0] || propertyData.images[0];
    if (heroImage) {
        try {
            const imgData = await loadImageAsDataURL(heroImage);
            doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight * 0.6, undefined, "FAST");

            // Soft white gradient overlay (glassmorphism effect)
            doc.setFillColor(255, 255, 255);
            doc.setGState(new doc.GState({ opacity: 0.3 }));
            doc.rect(0, pageHeight * 0.45, pageWidth, pageHeight * 0.15, "F");
            doc.setGState(new doc.GState({ opacity: 1 }));
        } catch (error) {
            console.error("Failed to load hero image:", error);
        }
    }

    // Glassmorphism title card
    const titleY = pageHeight * 0.65;
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.85 }));
    doc.roundedRect(margin, titleY, pageWidth - 2 * margin, 80, 5, 5, "F");
    doc.setGState(new doc.GState({ opacity: 1 }));

    // Soft border (teal accent)
    doc.setDrawColor(0, 188, 212); // Teal
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, titleY, pageWidth - 2 * margin, 80, 5, 5, "S");

    // Title
    doc.setTextColor(30, 41, 59); // Slate gray
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(propertyData.title, pageWidth - 40);
    doc.text(titleLines, pageWidth / 2, titleY + 15, { align: "center" });

    // Price - Large and prominent (teal color)
    doc.setFontSize(26);
    doc.setTextColor(0, 150, 136); // Teal
    doc.text(propertyData.price, pageWidth / 2, titleY + 35, { align: "center" });

    // Location with icon
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // Slate
    doc.text("📍 " + propertyData.location, pageWidth / 2, titleY + 48, { align: "center" });

    // Property stats in glassmorphism cards
    const statsY = titleY + 60;
    const cardWidth = 50;
    const cardSpacing = 5;
    const startX = (pageWidth - (cardWidth * 3 + cardSpacing * 2)) / 2;

    // Helper to draw stat card with glassmorphism
    const drawStatCard = (x: number, icon: string, value: string, label: string) => {
        if (!value) return;

        // Glass card background
        doc.setFillColor(255, 255, 255);
        doc.setGState(new doc.GState({ opacity: 0.7 }));
        doc.roundedRect(x, statsY, cardWidth, 18, 3, 3, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));

        // Soft teal border
        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, statsY, cardWidth, 18, 3, 3, "S");

        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(icon + " " + value, x + cardWidth / 2, statsY + 8, { align: "center" });

        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + cardWidth / 2, statsY + 14, { align: "center" });
    };

    if (propertyData.bedrooms) drawStatCard(startX, "🛏️", propertyData.bedrooms, "Bedrooms");
    if (propertyData.bathrooms) drawStatCard(startX + cardWidth + cardSpacing, "🚿", propertyData.bathrooms, "Bathrooms");
    if (propertyData.area) drawStatCard(startX + (cardWidth + cardSpacing) * 2, "📐", propertyData.area, "Area");

    // Source badge
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Source: " + propertyData.source, pageWidth / 2, pageHeight - 10, { align: "center" });

    // ==================== PAGE 2: PROPERTY DETAILS WITH GLASSMORPHISM ====================
    doc.addPage();
    doc.setFillColor(248, 250, 252); // Very light blue-gray
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    let currentY = 20;

    // Section header with glassmorphism
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.8 }));
    doc.roundedRect(margin - 5, currentY - 5, pageWidth - 2 * (margin - 5), 14, 3, 3, "F");
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setDrawColor(0, 188, 212);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin - 5, currentY - 5, pageWidth - 2 * (margin - 5), 14, 3, 3, "S");

    doc.setFontSize(16);
    doc.setTextColor(0, 150, 136);
    doc.setFont("helvetica", "bold");
    doc.text("PROPERTY OVERVIEW", margin, currentY + 5);

    currentY += 22;

    // Description card with glassmorphism
    doc.setFillColor(255, 255, 255);
    doc.setGState(new doc.GState({ opacity: 0.7 }));
    const descHeight = Math.min(doc.splitTextToSize(propertyData.description, pageWidth - 2 * margin - 10).length * 5 + 10, 60);
    doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, descHeight, 3, 3, "F");
    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setDrawColor(0, 188, 212);
    doc.setLineWidth(0.2);
    doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, descHeight, 3, 3, "S");

    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(propertyData.description, pageWidth - 2 * margin - 10);
    doc.text(descLines, margin + 5, currentY);
    currentY += descHeight + 10;

    // Features section
    if (propertyData.features.length > 0) {
        doc.setFillColor(255, 255, 255);
        doc.setGState(new doc.GState({ opacity: 0.8 }));
        doc.roundedRect(margin - 5, currentY - 5, pageWidth - 2 * (margin - 5), 14, 3, 3, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));

        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin - 5, currentY - 5, pageWidth - 2 * (margin - 5), 14, 3, 3, "S");

        doc.setFontSize(14);
        doc.setTextColor(0, 150, 136);
        doc.setFont("helvetica", "bold");
        doc.text("KEY FEATURES", margin, currentY + 5);

        currentY += 20;

        // Features in glassmorphism card
        const featuresHeight = Math.ceil(propertyData.features.slice(0, 12).length / 2) * 7 + 10;
        doc.setFillColor(255, 255, 255);
        doc.setGState(new doc.GState({ opacity: 0.6 }));
        doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, featuresHeight, 3, 3, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));

        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, currentY - 5, pageWidth - 2 * margin, featuresHeight, 3, 3, "S");

        // Features in two columns
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.setFont("helvetica", "normal");

        const featuresPerColumn = Math.ceil(propertyData.features.length / 2);
        const columnWidth = (pageWidth - 3 * margin) / 2;

        propertyData.features.slice(0, 12).forEach((feature, index) => {
            const col = index < featuresPerColumn ? 0 : 1;
            const row = index % featuresPerColumn;
            const x = margin + 5 + col * (columnWidth + margin);
            const y = currentY + row * 7;

            doc.setTextColor(0, 150, 136);
            doc.text("●", x, y);
            doc.setTextColor(51, 65, 85);
            doc.text(feature.substring(0, 35), x + 5, y);
        });

        currentY += featuresHeight + 10;
    }

    // Property Details Table with glassmorphism
    if (currentY < pageHeight - 70) {
        doc.setFillColor(255, 255, 255);
        doc.setGState(new doc.GState({ opacity: 0.8 }));
        doc.roundedRect(margin - 5, currentY - 5, pageWidth - 2 * (margin - 5), 14, 3, 3, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));

        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin - 5, currentY - 5, pageWidth - 2 * (margin - 5), 14, 3, 3, "S");

        doc.setFontSize(14);
        doc.setTextColor(0, 150, 136);
        doc.setFont("helvetica", "bold");
        doc.text("SPECIFICATIONS", margin, currentY + 5);

        currentY += 18;

        const tableData = [];
        if (propertyData.bedrooms) tableData.push(["Bedrooms", propertyData.bedrooms]);
        if (propertyData.bathrooms) tableData.push(["Bathrooms", propertyData.bathrooms]);
        if (propertyData.area) tableData.push(["Total Area", propertyData.area]);
        tableData.push(["Location", propertyData.location]);
        tableData.push(["Price", propertyData.price]);

        autoTable(doc, {
            startY: currentY,
            head: [["Specification", "Details"]],
            body: tableData,
            theme: "grid",
            headStyles: {
                fillColor: [0, 188, 212], // Teal
                textColor: [255, 255, 255],
                fontStyle: "bold",
                fontSize: 11,
            },
            bodyStyles: {
                fillColor: [255, 255, 255],
                textColor: [51, 65, 85],
                fontSize: 10,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            margin: { left: margin, right: margin },
        });
    }

    // ==================== PAGE 3+: IMAGE GALLERY WITH GLASSMORPHISM ====================
    const allImages = [...customImages, ...propertyData.images].slice(0, 9);

    if (allImages.length > 1) {
        doc.addPage();
        doc.setFillColor(248, 250, 252);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        doc.setFillColor(255, 255, 255);
        doc.setGState(new doc.GState({ opacity: 0.8 }));
        doc.roundedRect(margin - 5, 15, pageWidth - 2 * (margin - 5), 14, 3, 3, "F");
        doc.setGState(new doc.GState({ opacity: 1 }));

        doc.setDrawColor(0, 188, 212);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin - 5, 15, pageWidth - 2 * (margin - 5), 14, 3, 3, "S");

        doc.setFontSize(16);
        doc.setTextColor(0, 150, 136);
        doc.setFont("helvetica", "bold");
        doc.text("PROPERTY GALLERY", margin, 23);

        const imgWidth = (pageWidth - 4 * margin) / 2;
        const imgHeight = imgWidth * 0.75;
        let imgX = margin;
        let imgY = 38;

        for (let i = 1; i < allImages.length && i < 9; i++) {
            try {
                const imgData = await loadImageAsDataURL(allImages[i]);

                // Add image with soft border
                doc.addImage(imgData, "JPEG", imgX, imgY, imgWidth, imgHeight, undefined, "FAST");
                doc.setDrawColor(0, 188, 212);
                doc.setLineWidth(0.5);
                doc.roundedRect(imgX, imgY, imgWidth, imgHeight, 2, 2, "S");

                imgX += imgWidth + margin;
                if (imgX > pageWidth - imgWidth - margin) {
                    imgX = margin;
                    imgY += imgHeight + margin;

                    if (imgY > pageHeight - imgHeight - 20) {
                        doc.addPage();
                        doc.setFillColor(248, 250, 252);
                        doc.rect(0, 0, pageWidth, pageHeight, "F");
                        imgY = 20;
                    }
                }
            } catch (error) {
                console.error(`Failed to load image ${i}:`, error);
            }
        }
    }

    // Return PDF as Blob for preview
    return doc.output("blob");
}
