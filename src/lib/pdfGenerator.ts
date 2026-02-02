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
): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // ==================== PAGE 1: PREMIUM COVER ====================
    // Deep gradient background
    doc.setFillColor(5, 5, 5);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Add hero image with overlay
    const heroImage = customImages[0] || propertyData.images[0];
    if (heroImage) {
        try {
            const imgData = await loadImageAsDataURL(heroImage);
            doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight * 0.65, undefined, "FAST");

            // Dark gradient overlay
            doc.setFillColor(0, 0, 0, 0.6);
            doc.rect(0, pageHeight * 0.45, pageWidth, pageHeight * 0.2, "F");
        } catch (error) {
            console.error("Failed to load hero image:", error);
        }
    }

    // Premium title card
    const titleY = pageHeight * 0.68;
    doc.setFillColor(10, 10, 10, 0.95);
    doc.roundedRect(margin, titleY, pageWidth - 2 * margin, 75, 3, 3, "F");

    // Neon accent line
    doc.setDrawColor(0, 242, 234);
    doc.setLineWidth(1);
    doc.line(margin, titleY, pageWidth - margin, titleY);

    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    const titleLines = doc.splitTextToSize(propertyData.title, pageWidth - 40);
    doc.text(titleLines, pageWidth / 2, titleY + 15, { align: "center" });

    // Price - Large and prominent
    doc.setFontSize(28);
    doc.setTextColor(212, 175, 55);
    doc.text(propertyData.price, pageWidth / 2, titleY + 35, { align: "center" });

    // Location with icon
    doc.setFontSize(12);
    doc.setTextColor(0, 242, 234);
    doc.text("📍 " + propertyData.location, pageWidth / 2, titleY + 48, { align: "center" });

    // Property stats in modern cards
    const statsY = titleY + 58;
    const cardWidth = 45;
    const cardSpacing = 5;
    const startX = (pageWidth - (cardWidth * 3 + cardSpacing * 2)) / 2;

    // Helper to draw stat card
    const drawStatCard = (x: number, icon: string, value: string, label: string) => {
        if (!value) return;

        doc.setFillColor(20, 20, 20, 0.8);
        doc.roundedRect(x, statsY, cardWidth, 16, 2, 2, "F");

        doc.setDrawColor(0, 242, 234, 0.3);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, statsY, cardWidth, 16, 2, 2, "S");

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(icon + " " + value, x + cardWidth / 2, statsY + 7, { align: "center" });

        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(label, x + cardWidth / 2, statsY + 13, { align: "center" });
    };

    if (propertyData.bedrooms) drawStatCard(startX, "🛏️", propertyData.bedrooms, "Bedrooms");
    if (propertyData.bathrooms) drawStatCard(startX + cardWidth + cardSpacing, "🚿", propertyData.bathrooms, "Bathrooms");
    if (propertyData.area) drawStatCard(startX + (cardWidth + cardSpacing) * 2, "📐", propertyData.area, "Area");

    // Source badge
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Source: " + propertyData.source, pageWidth / 2, pageHeight - 10, { align: "center" });

    // ==================== PAGE 2: PROPERTY DETAILS ====================
    doc.addPage();
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    let currentY = 20;

    // Section header
    doc.setFillColor(0, 242, 234, 0.1);
    doc.rect(0, currentY - 5, pageWidth, 12, "F");
    doc.setFontSize(18);
    doc.setTextColor(0, 242, 234);
    doc.setFont("helvetica", "bold");
    doc.text("PROPERTY OVERVIEW", margin, currentY + 5);

    currentY += 20;

    // Description with better formatting
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal");
    const descLines = doc.splitTextToSize(propertyData.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, currentY);
    currentY += descLines.length * 5 + 15;

    // Features section
    if (propertyData.features.length > 0) {
        doc.setFillColor(0, 242, 234, 0.1);
        doc.rect(0, currentY - 5, pageWidth, 12, "F");
        doc.setFontSize(16);
        doc.setTextColor(0, 242, 234);
        doc.setFont("helvetica", "bold");
        doc.text("KEY FEATURES", margin, currentY + 5);

        currentY += 18;

        // Features in two columns
        doc.setFontSize(9);
        doc.setTextColor(220, 220, 220);
        doc.setFont("helvetica", "normal");

        const featuresPerColumn = Math.ceil(propertyData.features.length / 2);
        const columnWidth = (pageWidth - 3 * margin) / 2;

        propertyData.features.slice(0, 12).forEach((feature, index) => {
            const col = index < featuresPerColumn ? 0 : 1;
            const row = index % featuresPerColumn;
            const x = margin + col * (columnWidth + margin);
            const y = currentY + row * 7;

            doc.setTextColor(0, 242, 234);
            doc.text("•", x, y);
            doc.setTextColor(220, 220, 220);
            doc.text(feature.substring(0, 40), x + 5, y);
        });

        currentY += featuresPerColumn * 7 + 15;
    }

    // Property Details Table
    if (currentY < pageHeight - 60) {
        doc.setFillColor(0, 242, 234, 0.1);
        doc.rect(0, currentY - 5, pageWidth, 12, "F");
        doc.setFontSize(16);
        doc.setTextColor(0, 242, 234);
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
                fillColor: [0, 242, 234],
                textColor: [10, 10, 10],
                fontStyle: "bold",
                fontSize: 11,
            },
            bodyStyles: {
                fillColor: [20, 20, 20],
                textColor: [220, 220, 220],
                fontSize: 10,
            },
            alternateRowStyles: {
                fillColor: [15, 15, 15],
            },
            margin: { left: margin, right: margin },
        });
    }

    // ==================== PAGE 3+: IMAGE GALLERY ====================
    const allImages = [...customImages, ...propertyData.images].slice(0, 9);

    if (allImages.length > 1) {
        doc.addPage();
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, pageWidth, pageHeight, "F");

        doc.setFillColor(0, 242, 234, 0.1);
        doc.rect(0, 15, pageWidth, 12, "F");
        doc.setFontSize(18);
        doc.setTextColor(0, 242, 234);
        doc.setFont("helvetica", "bold");
        doc.text("PROPERTY GALLERY", margin, 22);

        const imgWidth = (pageWidth - 4 * margin) / 2;
        const imgHeight = imgWidth * 0.75;
        let imgX = margin;
        let imgY = 35;

        for (let i = 1; i < allImages.length && i < 9; i++) {
            try {
                const imgData = await loadImageAsDataURL(allImages[i]);

                // Add image with border
                doc.addImage(imgData, "JPEG", imgX, imgY, imgWidth, imgHeight, undefined, "FAST");
                doc.setDrawColor(0, 242, 234, 0.5);
                doc.setLineWidth(0.5);
                doc.rect(imgX, imgY, imgWidth, imgHeight);

                imgX += imgWidth + margin;
                if (imgX > pageWidth - imgWidth - margin) {
                    imgX = margin;
                    imgY += imgHeight + margin;

                    if (imgY > pageHeight - imgHeight - 20) {
                        doc.addPage();
                        doc.setFillColor(10, 10, 10);
                        doc.rect(0, 0, pageWidth, pageHeight, "F");
                        imgY = 20;
                    }
                }
            } catch (error) {
                console.error(`Failed to load image ${i}:`, error);
            }
        }
    }

    // Save PDF
    doc.save(`${propertyData.title.substring(0, 30).replace(/[^a-z0-9]/gi, "_")}_Property.pdf`);
}
