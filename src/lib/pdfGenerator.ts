/**
 * Premium PDF Generator using html2pdf.js
 * Creates a beautiful, modern property presentation PDF from HTML/CSS.
 */

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
    try {
        const parsed = new URL(url);
        if (parsed.origin !== window.location.origin) {
            return `/.netlify/functions/proxy-image?url=${encodeURIComponent(url)}`;
        }
    } catch { /* not a valid URL, return as-is */ }
    return url;
}

// Convert image URL to base64 data URL via proxy (for PDF embedding)
async function toBase64(url: string): Promise<string | null> {
    try {
        const proxied = getProxiedUrl(url);
        const res = await fetch(proxied);
        if (!res.ok) return null;
        const blob = await res.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

function buildCoverPage(data: PropertyData, heroImage: string | null): string {
    return `
    <div class="page cover-page" style="position:relative; overflow:hidden;">
        ${heroImage ? `
        <div style="position:absolute; inset:0;">
            <img src="${heroImage}" style="width:100%; height:100%; object-fit:cover; filter:brightness(0.45);" />
        </div>
        ` : `
        <div style="position:absolute; inset:0; background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);"></div>
        `}
        <div style="position:relative; z-index:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; padding: 60px 50px;">
            <div style="border-left: 4px solid #38bdf8; padding-left: 20px; margin-bottom: 20px;">
                <p style="font-family: 'Segoe UI', sans-serif; font-size: 13px; letter-spacing: 4px; color: #38bdf8; margin: 0 0 12px 0; text-transform: uppercase;">Exclusive Listing</p>
                <h1 style="font-family: 'Georgia', serif; font-size: 36px; color: #fff; margin: 0 0 16px 0; line-height: 1.2; font-weight: 400;">${data.title}</h1>
                <p style="font-family: 'Segoe UI', sans-serif; font-size: 14px; color: rgba(255,255,255,0.7); margin: 0;">
                    <span style="display:inline-block; margin-right: 6px;">📍</span>${data.location}
                </p>
            </div>
            <div style="margin-top: 24px; display: flex; align-items: center; gap: 30px;">
                <div style="background: rgba(56,189,248,0.15); border: 1px solid rgba(56,189,248,0.3); border-radius: 10px; padding: 16px 28px;">
                    <p style="font-family: 'Segoe UI', sans-serif; font-size: 11px; color: #38bdf8; margin: 0 0 4px 0; letter-spacing: 2px; text-transform: uppercase;">Asking Price</p>
                    <p style="font-family: 'Georgia', serif; font-size: 32px; color: #fff; margin: 0; font-weight: 700;">${data.price}</p>
                </div>
                ${data.bedrooms || data.bathrooms || data.area ? `
                <div style="display: flex; gap: 24px;">
                    ${data.bedrooms ? `<div style="text-align:center;"><p style="font-size:24px; color:#fff; margin:0; font-weight:600;">${data.bedrooms}</p><p style="font-size:11px; color:rgba(255,255,255,0.6); margin:4px 0 0; text-transform:uppercase; letter-spacing:1px;">Beds</p></div>` : ''}
                    ${data.bathrooms ? `<div style="text-align:center;"><p style="font-size:24px; color:#fff; margin:0; font-weight:600;">${data.bathrooms}</p><p style="font-size:11px; color:rgba(255,255,255,0.6); margin:4px 0 0; text-transform:uppercase; letter-spacing:1px;">Baths</p></div>` : ''}
                    ${data.area ? `<div style="text-align:center;"><p style="font-size:24px; color:#fff; margin:0; font-weight:600;">${data.area}</p><p style="font-size:11px; color:rgba(255,255,255,0.6); margin:4px 0 0; text-transform:uppercase; letter-spacing:1px;">Area</p></div>` : ''}
                </div>
                ` : ''}
            </div>
        </div>
        <div style="position:absolute; bottom:0; left:0; right:0; height:4px; background: linear-gradient(90deg, #38bdf8, #a78bfa, #f472b6);"></div>
    </div>`;
}

function buildDetailsPage(data: PropertyData): string {
    const specs = [
        data.bedrooms ? { icon: '🛏️', label: 'Bedrooms', value: data.bedrooms } : null,
        data.bathrooms ? { icon: '🚿', label: 'Bathrooms', value: data.bathrooms } : null,
        data.area ? { icon: '📐', label: 'Living Area', value: data.area } : null,
        { icon: '📍', label: 'Location', value: data.location.split(',')[0] || data.location },
    ].filter(Boolean) as { icon: string; label: string; value: string }[];

    return `
    <div class="page details-page" style="background: #fff; padding: 50px;">
        <div style="border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 30px;">
            <p style="font-size: 11px; letter-spacing: 3px; color: #64748b; text-transform: uppercase; margin: 0 0 4px 0;">Property Details</p>
            <h2 style="font-family: 'Georgia', serif; font-size: 28px; color: #0f172a; margin: 0; font-weight: 400;">${data.title}</h2>
        </div>

        <div style="display: grid; grid-template-columns: repeat(${Math.min(specs.length, 4)}, 1fr); gap: 16px; margin-bottom: 32px;">
            ${specs.map(s => `
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; border: 1px solid #e2e8f0;">
                <p style="font-size: 28px; margin: 0 0 4px 0;">${s.icon}</p>
                <p style="font-family: 'Georgia', serif; font-size: 22px; color: #0f172a; margin: 0 0 4px 0; font-weight: 600;">${s.value}</p>
                <p style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin: 0;">${s.label}</p>
            </div>
            `).join('')}
        </div>

        <div style="margin-bottom: 32px;">
            <p style="font-size: 11px; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase; margin: 0 0 12px 0; font-weight: 600;">Description</p>
            <p style="font-size: 13px; color: #334155; line-height: 1.8; margin: 0;">${data.description}</p>
        </div>

        ${data.features.length > 0 ? `
        <div>
            <p style="font-size: 11px; letter-spacing: 2px; color: #38bdf8; text-transform: uppercase; margin: 0 0 14px 0; font-weight: 600;">Amenities & Features</p>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${data.features.map(f => `
                <span style="display: inline-block; padding: 6px 14px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 20px; font-size: 11px; color: #0369a1;">✓ ${f}</span>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <div style="position:absolute; bottom:0; left:0; right:0; height:4px; background: linear-gradient(90deg, #38bdf8, #a78bfa, #f472b6);"></div>
    </div>`;
}

function buildGalleryPage(imageSrc: string, pageNum: number, totalPages: number): string {
    const label = `${pageNum} / ${totalPages}`;

    return `
    <div class="page gallery-page" style="background: #0f172a; padding: 0; display:flex; flex-direction:column;">
        <div style="flex:1; display:flex; align-items:center; justify-content:center; padding: 20px;">
            <img src="${imageSrc}" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:4px;" />
        </div>
        <div style="padding: 8px 30px 12px; display:flex; justify-content:space-between; align-items:center;">
            <div style="width:40px; height:2px; background:#38bdf8;"></div>
            <p style="font-size:10px; letter-spacing:2px; color:rgba(255,255,255,0.4); text-transform:uppercase; margin:0;">Photo ${label}</p>
            <div style="width:40px; height:2px; background:#38bdf8;"></div>
        </div>
        <div style="position:absolute; bottom:0; left:0; right:0; height:4px; background: linear-gradient(90deg, #38bdf8, #a78bfa, #f472b6);"></div>
    </div>`;
}

function buildFooterPage(data: PropertyData): string {
    return `
    <div class="page footer-page" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%); display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; padding: 60px;">
        <div style="margin-bottom: 40px;">
            <p style="font-size: 11px; letter-spacing: 4px; color: #38bdf8; text-transform: uppercase; margin: 0 0 16px 0;">Thank You For Your Interest</p>
            <h2 style="font-family: 'Georgia', serif; font-size: 32px; color: #fff; margin: 0 0 8px 0; font-weight: 400;">${data.title}</h2>
            <p style="font-size: 28px; color: #38bdf8; margin: 0; font-weight: 600;">${data.price}</p>
        </div>
        <div style="border-top: 1px solid rgba(255,255,255,0.15); padding-top: 30px; width: 300px;">
            <p style="font-size: 13px; color: rgba(255,255,255,0.5); margin: 0 0 4px 0;">Presented by</p>
            <p style="font-size: 18px; color: #fff; margin: 0; font-weight: 600;">DO Panama Real Estate</p>
            <p style="font-size: 12px; color: rgba(255,255,255,0.4); margin: 8px 0 0 0;">Premium Property Solutions</p>
        </div>
        <div style="position:absolute; bottom:0; left:0; right:0; height:4px; background: linear-gradient(90deg, #38bdf8, #a78bfa, #f472b6);"></div>
    </div>`;
}

export async function generatePropertyPDF(
    propertyData: PropertyData,
    customImages: string[]
): Promise<Blob> {
    // Dynamically import html2pdf (client-side only)
    const html2pdf = (await import('html2pdf.js')).default;

    // Prepare images — deduplicate, load as base64 for reliable PDF embedding
    const allImageUrls = [...new Set([...customImages, ...propertyData.images])];

    // Load images in parallel as base64 for reliable embedding
    const imagePromises = allImageUrls.map(url => toBase64(url));
    const base64Images = (await Promise.all(imagePromises)).filter(Boolean) as string[];

    // Hero image = first one
    const heroImage = base64Images[0] || null;

    // Build gallery pages — one full-bleed image per page (no cropping, no blank pages)
    const galleryPages: string[] = [];
    for (let i = 0; i < base64Images.length; i++) {
        galleryPages.push(buildGalleryPage(base64Images[i], i + 1, base64Images.length));
    }

    // Assemble full HTML document
    const html = `
    <div id="pdf-root" style="font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #0f172a;">
        <style>
            .page {
                width: 297mm;
                min-height: 210mm;
                height: 210mm;
                position: relative;
                overflow: hidden;
                box-sizing: border-box;
                page-break-after: always;
            }
            .page:last-child {
                page-break-after: auto;
            }
            * { box-sizing: border-box; }
        </style>

        ${buildCoverPage(propertyData, heroImage)}
        ${buildDetailsPage(propertyData)}
        ${galleryPages.join('\n')}
        ${buildFooterPage(propertyData)}
    </div>`;

    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    document.body.appendChild(container);

    try {
        const pdfBlob: Blob = await html2pdf()
            .set({
                margin: 0,
                filename: 'property_presentation.pdf',
                image: { type: 'jpeg', quality: 0.92 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    logging: false,
                },
                jsPDF: {
                    unit: 'mm',
                    format: 'a4',
                    orientation: 'landscape',
                },
                pagebreak: { mode: ['css', 'legacy'], after: '.page' },
            })
            .from(container.querySelector('#pdf-root') as HTMLElement)
            .outputPdf('blob');

        return pdfBlob;
    } finally {
        document.body.removeChild(container);
    }
}
