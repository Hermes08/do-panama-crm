import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

export async function generatePropertyPDF(
    propertyData: PropertyData,
    customImages: string[] = []
): Promise<Blob> {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Page 1: Cover Page
    doc.setFillColor(10, 25, 47); // Dark navy background
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Add main image if available
    const mainImage = customImages[0] || propertyData.images[0];
    if (mainImage) {
        try {
            const imgData = await loadImageAsDataURL(mainImage);
            doc.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight * 0.6, undefined, 'FAST');
        } catch (error) {
            console.error('Failed to load cover image:', error);
        }
    }

    // Title overlay
    doc.setFillColor(0, 0, 0, 0.5);
    doc.rect(0, pageHeight * 0.5, pageWidth, pageHeight * 0.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text(propertyData.title, pageWidth / 2, pageHeight * 0.65, { align: 'center', maxWidth: pageWidth - 40 });

    doc.setFontSize(20);
    doc.setTextColor(212, 175, 55); // Gold
    doc.text(propertyData.price, pageWidth / 2, pageHeight * 0.75, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(200, 200, 200);
    doc.text(propertyData.location, pageWidth / 2, pageHeight * 0.82, { align: 'center' });

    // Page 2: Property Details
    doc.addPage();
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    let yPos = margin;

    // Header
    doc.setTextColor(10, 25, 47);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Property Details', margin, yPos);
    yPos += 15;

    // Quick Stats
    const stats = [
        ['Bedrooms', propertyData.bedrooms || 'N/A'],
        ['Bathrooms', propertyData.bathrooms || 'N/A'],
        ['Area', propertyData.area || 'N/A'],
        ['Location', propertyData.location],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [['Feature', 'Value']],
        body: stats,
        theme: 'grid',
        headStyles: { fillColor: [10, 25, 47], textColor: [255, 255, 255] },
        margin: { left: margin, right: margin },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Description
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Description', margin, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(propertyData.description, pageWidth - 2 * margin);
    doc.text(descLines, margin, yPos);
    yPos += descLines.length * 5 + 10;

    // Features
    if (propertyData.features.length > 0 && yPos < pageHeight - 60) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Features & Amenities', margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        propertyData.features.slice(0, 15).forEach((feature) => {
            if (yPos > pageHeight - margin) {
                doc.addPage();
                yPos = margin;
            }
            doc.text(`• ${feature}`, margin + 5, yPos);
            yPos += 6;
        });
    }

    // Page 3+: Image Gallery
    const allImages = [...customImages, ...propertyData.images].slice(0, 12);
    if (allImages.length > 1) {
        doc.addPage();
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        doc.setTextColor(10, 25, 47);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Gallery', margin, margin);

        let imgYPos = margin + 15;
        const imgWidth = (pageWidth - 3 * margin) / 2;
        const imgHeight = imgWidth * 0.75;
        let imgXPos = margin;
        let imgCount = 0;

        for (let i = 1; i < allImages.length; i++) {
            try {
                const imgData = await loadImageAsDataURL(allImages[i]);

                if (imgYPos + imgHeight > pageHeight - margin) {
                    doc.addPage();
                    imgYPos = margin;
                    imgXPos = margin;
                    imgCount = 0;
                }

                doc.addImage(imgData, 'JPEG', imgXPos, imgYPos, imgWidth, imgHeight, undefined, 'FAST');

                imgCount++;
                if (imgCount % 2 === 0) {
                    imgYPos += imgHeight + 10;
                    imgXPos = margin;
                } else {
                    imgXPos += imgWidth + margin;
                }
            } catch (error) {
                console.error(`Failed to load image ${i}:`, error);
            }
        }
    }

    // Footer on last page
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            `Source: ${propertyData.source} | Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    return doc.output('blob');
}

async function loadImageAsDataURL(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                reject(new Error('Failed to get canvas context'));
            }
        };

        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
}
