import type { Handler, HandlerEvent } from "@netlify/functions";
import * as cheerio from "cheerio";

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

// Helper function to decode HTML entities and preserve UTF-8 characters
function decodeHTMLEntities(text: string): string {
    const entities: Record<string, string> = {
        '&amp;': '&',
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&#39;': "'",
        '&apos;': "'",
        '&nbsp;': ' ',
        '&ntilde;': 'ñ',
        '&Ntilde;': 'Ñ',
        '&aacute;': 'á',
        '&eacute;': 'é',
        '&iacute;': 'í',
        '&oacute;': 'ó',
        '&uacute;': 'ú',
        '&Aacute;': 'Á',
        '&Eacute;': 'É',
        '&Iacute;': 'Í',
        '&Oacute;': 'Ó',
        '&Uacute;': 'Ú',
        '&uuml;': 'ü',
        '&Uuml;': 'Ü',
        '&iexcl;': '¡',
        '&iquest;': '¿',
        '&#178;': '²',
        '&#179;': '³',
        '&sup2;': '²',
        '&sup3;': '³',
        '&deg;': '°',
    };

    let decoded = text;

    // Replace named entities
    for (const [entity, char] of Object.entries(entities)) {
        decoded = decoded.replace(new RegExp(entity, 'g'), char);
    }

    // Replace numeric entities (&#XXXX;)
    decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
        return String.fromCharCode(parseInt(dec, 10));
    });

    // Replace hex entities (&#xXXXX;)
    decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });

    return decoded;
}

// Clean and normalize text
function cleanText(text: string): string {
    if (!text) return '';

    // Decode HTML entities first
    let cleaned = decodeHTMLEntities(text);

    // Remove excessive whitespace but preserve single spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove any remaining control characters except newlines
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return cleaned;
}

// Remove private information (company names, agent names, phone numbers, emails)
function removePrivateInfo(text: string): string {
    if (!text) return text;

    let cleaned = text;

    // Remove phone numbers (various formats)
    cleaned = cleaned.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '');
    cleaned = cleaned.replace(/\d{4}[-.\s]?\d{4}/g, ''); // Simple format: 1234-5678

    // Remove emails
    cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '');

    // Remove contact phrases (Spanish and English)
    const contactPatterns = [
        /contactar?\s+a?\s*:?\s*[\w\s]+/gi,
        /contact\s+:?\s*[\w\s]+/gi,
        /agente\s*:?\s*[\w\s]+/gi,
        /agent\s*:?\s*[\w\s]+/gi,
        /llamar?\s+al?\s*:?\s*[\w\s]+/gi,
        /call\s+:?\s*[\w\s]+/gi,
        /whatsapp\s*:?\s*[\w\s\d]+/gi,
        /tel[eé]fono\s*:?\s*[\w\s\d]+/gi,
        /phone\s*:?\s*[\w\s\d]+/gi,
        /correo\s*:?\s*[\w\s@.]+/gi,
        /email\s*:?\s*[\w\s@.]+/gi,
    ];

    for (const pattern of contactPatterns) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Remove reference codes
    cleaned = cleaned.replace(/ref\s*\.?\s*:?\s*[\w\d-]+/gi, '');
    cleaned = cleaned.replace(/referencia\s*:?\s*[\w\d-]+/gi, '');
    cleaned = cleaned.replace(/\bid\s*:?\s*[\w\d-]+/gi, '');
    cleaned = cleaned.replace(/c[oó]digo\s*:?\s*[\w\d-]+/gi, '');

    // Remove common real estate company names
    const companies = [
        'RE/MAX', 'REMAX', 'Century 21', 'Engel & Völkers', 'Sotheby\'s',
        'Coldwell Banker', 'Keller Williams', 'ERA', 'Berkshire Hathaway',
        'Inmobiliaria', 'Real Estate', 'Bienes Raíces', 'Realty', 'Properties',
        'Servicios Inmobiliarios', 'Grupo Inmobiliario', 'Asesores', 'Realtor',
        'Corredor', 'Broker'
    ];

    for (const company of companies) {
        // More aggressive company removal: remove the whole line if it contains the company name
        const regex = new RegExp(`.*${company}.*`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }

    // Remove social media handles and links
    cleaned = cleaned.replace(/@[\w.]+/g, '');
    cleaned = cleaned.replace(/(?:instagram|facebook|twitter|linkedin)\.com\/[\w.]+/gi, '');
    cleaned = cleaned.replace(/(?:ig|fb|tw|li)\s*:?\s*@?[\w.]+/gi, '');

    // Remove "Contact" blocks more aggressively
    // Look for lines that look like contact info
    const contactLines = [
        /Para m[áa]s informaci[oó]n.*/gi,
        /For more information.*/gi,
        /Contact me.*/gi,
        /Cont[áa]ctame.*/gi,
        /Agenda tu cita.*/gi,
        /Schedule a visit.*/gi,
        /Interesado.*/gi,
        /Interested.*/gi,
        /Hablemos.*/gi,
        /Let's talk.*/gi
    ];

    for (const pattern of contactLines) {
        cleaned = cleaned.replace(pattern, '');
    }

    // Clean up extra spaces and punctuation
    cleaned = cleaned.replace(/\s{2,}/g, ' ');
    cleaned = cleaned.replace(/\s+([.,;:])/g, '$1');
    cleaned = cleaned.replace(/^[.,;:\s]+|[.,;:\s]+$/g, '');

    return cleaned.trim();
}

// Translate property data to English using OpenAI
async function translateToEnglish(data: PropertyData): Promise<PropertyData> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
        console.warn("OPENAI_API_KEY not found, skipping translation");
        return data;
    }

    try {
        // Prepare content for translation
        const contentToTranslate = {
            title: data.title,
            description: data.description,
            location: data.location,
            features: data.features || [],
            bedrooms: data.bedrooms || '',
            bathrooms: data.bathrooms || '',
            area: data.area || ''
        };

        console.log("Translating to English...");

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [{
                    role: 'system',
                    content: `You are a professional real estate translator. Translate the following property listing data to English.
                    
CRITICAL RULES:
- Preserve all numbers exactly as they are
- Keep measurements (m², sq ft, etc.) unchanged
- Maintain formatting and structure
- Return ONLY a JSON object with the same structure
- Do not add explanations or extra text
- If text is already in English, keep it as is

Return format:
{
  "title": "translated title",
  "description": "translated description",
  "location": "translated location",
  "features": ["feature1", "feature2"],
  "bedrooms": "translated bedrooms",
  "bathrooms": "translated bathrooms",
  "area": "translated area"
}`
                }, {
                    role: 'user',
                    content: JSON.stringify(contentToTranslate)
                }],
                temperature: 0.3,
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API failed: ${response.status}`);
        }

        const result = await response.json();
        const translated = JSON.parse(result.choices[0].message.content);

        console.log("Translation successful");

        return {
            ...data,
            title: translated.title || data.title,
            description: translated.description || data.description,
            location: translated.location || data.location,
            features: translated.features || data.features,
            bedrooms: translated.bedrooms || data.bedrooms,
            bathrooms: translated.bathrooms || data.bathrooms,
            area: translated.area || data.area
        };

    } catch (error) {
        console.error("Translation error:", error);
        console.log("Returning original data without translation");
        return data; // Fallback to original data
    }
}

// Extraction schemas for different real estate websites
const EXTRACTION_SCHEMAS: Record<string, any> = {
    'encuentra24.com': {
        type: "object",
        properties: {
            titulo: {
                type: "string",
                description: "Property title/headline. Extract the main property title, usually at the top of the page. Example: 'Apartamento en Venta - Punta Pacifica'"
            },
            precio: {
                type: "string",
                description: "Property price. Look for the listing price, including currency symbol. Example: '$250,000', 'US$ 350,000', 'B/. 180,000'. If price says 'Consultar' or 'Contact for price', use that exact text."
            },
            ubicacion: {
                type: "string",
                description: "Property location/address. Extract the neighborhood, district, and city. Example: 'Punta Pacifica, Panama City', 'Costa del Este, Panama'"
            },
            area: {
                type: "string",
                description: "CRITICAL: Property area/size. ALWAYS extract this. Look for total area, construction area, or lot size. Include units. Examples: '150 m²', '1,615 sq ft', '200 m² construcción'. If not found, search harder in details or description. MANDATORY."
            },
            detalles: {
                type: "array",
                description: "Property details including bedrooms, bathrooms, parking, floor, etc. Extract each detail as a separate item. Examples: '3 habitaciones', '2 baños', '2 estacionamientos', 'Piso 15'. DO NOT include area here, it goes in the 'area' field.",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Property amenities and features. Extract all amenities like pool, gym, security, etc. Examples: 'Piscina', 'Gimnasio', 'Seguridad 24/7', 'Área de BBQ', 'Salón de eventos'. DO NOT include contact information or agent names.",
                items: { type: "string" }
            },
            descripcion: {
                type: "string",
                description: "Full property description. Extract the complete description text that describes the property, its features, and surroundings. DO NOT include agent contact information, phone numbers, or emails."
            }
        },
        required: ["titulo", "precio", "ubicacion", "area", "descripcion"]
    },
    'jamesedition.com': {
        type: "object",
        properties: {
            titulo: {
                type: "string",
                description: "Property title. Extract the main listing title. Example: 'Luxury Penthouse in Panama City', 'Oceanfront Villa'"
            },
            precio: {
                type: "string",
                description: "Property price with currency. Example: '$2,500,000', '€1,800,000', 'Price upon request'"
            },
            ubicacion: {
                type: "string",
                description: "Property location. Extract city, region, and country. Example: 'Panama City, Panama', 'Bocas del Toro, Panama'"
            },
            area: {
                type: "string",
                description: "CRITICAL: Property area/size. ALWAYS extract this. Look for interior area, total area, or lot size. Include units. Examples: '500 m²', '5,382 sq ft', '1,000 m² interior + 2,000 m² lot'. MANDATORY."
            },
            descripcion: {
                type: "string",
                description: "Complete property description. Extract the full description including property highlights, features, and location details. Exclude agent contact information."
            },
            caracteristicas: {
                type: "array",
                description: "Property characteristics and specifications. Include bedrooms, bathrooms, year built, view, etc. Examples: '5 bedrooms', '6 bathrooms', 'Built in 2020', 'Ocean view', 'Penthouse'. DO NOT include area here.",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Luxury amenities and features. Examples: 'Infinity pool', 'Private gym', 'Wine cellar', 'Home theater', 'Smart home system', 'Helipad'. DO NOT include contact information.",
                items: { type: "string" }
            }
        },
        required: ["titulo", "precio", "ubicacion", "area", "descripcion"]
    },
    'compreoalquile.com': {
        type: "object",
        properties: {
            titulo: {
                type: "string",
                description: "Property title. Example: 'Casa en Venta - Albrook', 'Apartamento en Alquiler'"
            },
            precio: {
                type: "string",
                description: "Price or rental amount. Example: '$180,000', '$1,200/mes'"
            },
            ubicacion: {
                type: "string",
                description: "Location. Example: 'Albrook, Panama City'"
            },
            area: {
                type: "string",
                description: "CRITICAL: Property area. ALWAYS extract. Examples: '120 m²', '95 m² construcción'. MANDATORY field."
            },
            detalles: {
                type: "array",
                description: "Property details. Examples: '3 recámaras', '2.5 baños', '2 parqueos'. DO NOT include area.",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Amenities. Examples: 'Piscina', 'Parqueo', 'Área verde'",
                items: { type: "string" }
            },
            descripcion: {
                type: "string",
                description: "Property description without contact info"
            }
        },
        required: ["titulo", "precio", "area"]
    },
    'mlsacobir.com': {
        type: "object",
        properties: {
            titulo: {
                type: "string",
                description: "MLS listing title. Example: 'Modern Apartment in Coco del Mar'"
            },
            precio: {
                type: "string",
                description: "Listing price. Example: '$295,000', 'B/. 250,000'"
            },
            ubicacion: {
                type: "string",
                description: "Property location. Example: 'Coco del Mar, Panama City'"
            },
            area: {
                type: "string",
                description: "CRITICAL: Property area/size. ALWAYS extract this from MLS data. Examples: '110 m²', '1,184 sq ft', '85 m² + 15 m² balcony'. MANDATORY."
            },
            descripcion: {
                type: "string",
                description: "MLS listing description. Extract the complete property description without agent contact details."
            },
            caracteristicas: {
                type: "array",
                description: "MLS property characteristics. Examples: '3 bedrooms', '2 bathrooms', '1 parking space', 'Floor 8'. DO NOT include area here.",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Building and property amenities. Examples: 'Swimming pool', 'Gym', '24/7 security', 'Social area', 'Elevator'",
                items: { type: "string" }
            }
        },
        required: ["titulo", "precio", "ubicacion", "area", "descripcion"]
    }
};

// Get extraction schema based on URL
function getSchemaForUrl(url: string): any | null {
    try {
        const hostname = new URL(url).hostname.replace('www.', '');
        for (const [domain, schema] of Object.entries(EXTRACTION_SCHEMAS)) {
            if (hostname.includes(domain)) {
                return schema;
            }
        }
    } catch (e) {
        console.error("Error parsing URL:", e);
    }
    return null;
}

// Map structured data from FireCrawl to PropertyData format
function mapStructuredDataToPropertyData(data: any, url: string): PropertyData | null {
    // Accept both 'titulo' (Spanish) and 'title' (English)
    const title = data?.titulo || data?.title;
    const price = data?.precio || data?.price;

    // If we don't have at least title or price, return null
    if (!title && !price) {
        console.log("No title or price found in structured data");
        return null;
    }

    let hostname = "unknown";
    try {
        hostname = new URL(url).hostname.replace('www.', '');
    } catch (e) {
        console.error("Error parsing URL in mapStructuredDataToPropertyData:", e);
    }

    // Extract bedrooms, bathrooms, area from detalles/caracteristicas
    let bedrooms: string | undefined;
    let bathrooms: string | undefined;
    let area: string | undefined;

    // PRIORITY 1: Check if area is directly provided
    area = data.area || data.superficie || data.size;

    const allDetails = [
        ...(data.detalles || []),
        ...(data.caracteristicas || []),
        ...(data.features || [])
    ];

    for (const detail of allDetails) {
        if (!detail || typeof detail !== 'string') continue;
        const detailLower = detail.toLowerCase();

        // Bedrooms
        if (!bedrooms && /\d+\s*(hab|rec[aá]mara|bedroom|cuarto|dormitorio)/i.test(detail)) {
            bedrooms = detail;
        }

        // Bathrooms
        if (!bathrooms && /\d+(\.\d+)?\s*(ba[ñn]o|bathroom)/i.test(detail)) {
            bathrooms = detail;
        }

        // Area - IMPROVED REGEX
        if (!area && /\d+[,\d]*\s*(m[2²]|sq\.?\s*ft|metro|square|área)/i.test(detail)) {
            area = detail;
        }
    }

    // FALLBACK: If area still not found, try to extract from description
    if (!area) {
        const desc = data.descripcion || data.description || '';
        const areaMatch = desc.match(/(\d+[,\d]*)\s*(m[2²]|sq\.?\s*ft|metros?\s*cuadrados?)/i);
        if (areaMatch) {
            area = areaMatch[0];
            console.log("Extracted area from description:", area);
        }
    }

    // Combine all amenities/features
    const allFeatures = [
        ...(data.amenidades || []),
        ...(data.amenities || []),
        ...(data.caracteristicas || []),
        ...(data.features || [])
    ].filter((f: any) => f && typeof f === 'string');

    // Get description - prefer longer descriptions
    let description = data.descripcion || data.description || title || "Luxury property in Panama";

    // If description is too short, try to combine with other text
    if (description.length < 100 && data.detalles && Array.isArray(data.detalles)) {
        const detailsText = data.detalles.join('. ');
        if (detailsText.length > description.length) {
            description = detailsText;
        }
    }

    console.log("Mapped data:", {
        title: title ? "✓" : "✗",
        price: price ? "✓" : "✗",
        area: area ? "✓" : "✗",
        bedrooms: bedrooms ? "✓" : "✗",
        bathrooms: bathrooms ? "✗" : "✗",
        description: description.length + " chars",
        features: allFeatures.length + " items"
    });

    return {
        title: cleanText(title || "Property Listing"),
        price: cleanText(price || "Contact for Price"),
        location: cleanText(data.ubicacion || data.location || "Panama"),
        bedrooms,
        bathrooms,
        area,
        description: cleanText(description),
        features: allFeatures.map((f: string) => cleanText(f)),
        images: [], // Images will be extracted separately
        source: hostname
    };
}

// Extract property images with site-specific selectors
function extractPropertyImages($: ReturnType<typeof cheerio.load>, url: string): string[] {
    const images: string[] = [];
    const seenImages = new Set<string>();

    const hostname = new URL(url).hostname.replace('www.', '');

    // 1. Always try OG Image first (usually the main property image)
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg && !seenImages.has(ogImg)) {
        images.push(ogImg);
        seenImages.add(ogImg);
    }

    // 2. Site-specific gallery selectors
    let gallerySelectors: string[] = [];

    if (hostname.includes('encuentra24.com')) {
        gallerySelectors = [
            '.gallery-image img',
            '.carousel-item img',
            '.property-gallery img',
            '.photo-gallery img',
            '[class*="gallery"] img',
            '[class*="slider"] img',
            '[id*="gallery"] img'
        ];
    } else if (hostname.includes('jamesedition.com')) {
        gallerySelectors = [
            '.gallery img',
            '.image-gallery img',
            '[class*="Gallery"] img',
            '[class*="carousel"] img',
            '.listing-images img'
        ];
    } else if (hostname.includes('compreoalquile.com')) {
        gallerySelectors = [
            '.gallery img',
            '.property-images img',
            '[class*="gallery"] img',
            '[class*="slider"] img'
        ];
    } else if (hostname.includes('mlsacobir.com')) {
        gallerySelectors = [
            '.property-gallery img',
            '.listing-gallery img',
            '[class*="gallery"] img',
            '[class*="photo"] img'
        ];
    } else {
        // Generic gallery selectors for unknown sites
        gallerySelectors = [
            '[class*="gallery"] img',
            '[class*="Gallery"] img',
            '[id*="gallery"] img',
            '[class*="slider"] img',
            '[class*="carousel"] img',
            '[class*="photo"] img',
            'main img',
            '.content img',
            '#content img'
        ];
    }

    // Try each selector in order
    for (const selector of gallerySelectors) {
        $(selector).each((_, el) => {
            const src = $(el).attr('src') ||
                $(el).attr('data-src') ||
                $(el).attr('data-original') ||
                $(el).attr('data-lazy') ||
                $(el).attr('data-image');

            if (src && isValidPropertyImage(src) && !seenImages.has(src)) {
                images.push(src);
                seenImages.add(src);
            }
        });

        // If we found good images, stop searching
        if (images.length >= 5) break;
    }

    // 3. Fallback: If still no images, try all images but with strict filtering
    if (images.length < 3) {
        $('img').each((_, el) => {
            const src = $(el).attr('src') || $(el).attr('data-src');
            if (src && isValidPropertyImage(src) && !seenImages.has(src)) {
                // Additional size check - property images are usually larger
                const width = parseInt($(el).attr('width') || '0');
                const height = parseInt($(el).attr('height') || '0');

                // Skip small images (likely icons/logos)
                if (width > 200 || height > 200 || (!width && !height)) {
                    images.push(src);
                    seenImages.add(src);
                }
            }
        });
    }

    return images.slice(0, 15); // Return up to 15 images
}

// Validate if an image URL is likely a property image
function isValidPropertyImage(src: string): boolean {
    if (!src) return false;

    // Must be a full URL
    if (!src.startsWith('http')) return false;

    // Exclude common non-property images
    const excludePatterns = [
        'logo', 'icon', 'avatar', 'badge', 'button',
        'banner', 'ad', 'advertisement', 'sponsor',
        'facebook', 'twitter', 'instagram', 'whatsapp',
        'pixel', 'tracking', 'analytics',
        '1x1', 'spacer', 'blank',
        'favicon', 'sprite'
    ];

    const srcLower = src.toLowerCase();
    for (const pattern of excludePatterns) {
        if (srcLower.includes(pattern)) return false;
    }

    // Must be an image file
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const hasImageExtension = imageExtensions.some(ext => srcLower.includes(ext));

    // Allow if has image extension OR is from a CDN (CDNs often don't show extensions)
    const isCDN = srcLower.includes('cloudinary') ||
        srcLower.includes('imgix') ||
        srcLower.includes('cloudfront') ||
        srcLower.includes('akamai');

    return hasImageExtension || isCDN;
}

export const handler: Handler = async (event: HandlerEvent) => {
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: "Method not allowed" }),
        };
    }

    try {
        const { url } = JSON.parse(event.body || "{}");

        if (!url) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "URL is required" }),
            };
        }

        // Use FireCrawl API for robust scraping
        const FIRECRAWL_API_KEY = "fc-c3b388c7f1e14ef8a3fa5e3334b71add"; // Provided by user

        console.log("Scraping with FireCrawl:", url);

        // Check if we have a structured extraction schema for this URL
        const extractionSchema = getSchemaForUrl(url);

        let propertyData: PropertyData;

        if (extractionSchema) {
            // USE STRUCTURED EXTRACTION for supported sites
            console.log("Using structured extraction with schema");

            const fcResponse = await fetch("https://api.firecrawl.dev/v0/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${FIRECRAWL_API_KEY}`
                },
                body: JSON.stringify({
                    url: url,
                    extractorOptions: {
                        extractionSchema: extractionSchema,
                        mode: "llm-extraction"
                    },
                    pageOptions: {
                        onlyMainContent: true,
                        includeHtml: true // Still get HTML for image extraction
                    }
                })
            });

            if (!fcResponse.ok) {
                throw new Error(`FireCrawl API failed: ${fcResponse.status} ${fcResponse.statusText}`);
            }

            const fcData = await fcResponse.json();

            console.log("FireCrawl response keys:", Object.keys(fcData));
            console.log("FireCrawl data keys:", fcData.data ? Object.keys(fcData.data) : "no data");

            if (!fcData.success || !fcData.data) {
                console.error("FireCrawl unsuccessful response:", JSON.stringify(fcData, null, 2));
                throw new Error("FireCrawl returned unsuccessful response");
            }

            // Map structured data to PropertyData
            // Try multiple possible locations for the extracted data
            const structuredData =
                fcData.data.llm_extraction ||
                fcData.data.extract ||
                fcData.data.extraction ||
                fcData.data;

            console.log("Structured data:", JSON.stringify(structuredData, null, 2));

            const mappedData = mapStructuredDataToPropertyData(structuredData, url);

            if (!mappedData) {
                console.error("Failed to map data. Structured data was:", JSON.stringify(structuredData, null, 2));

                // FALLBACK: If structured extraction fails, fall back to HTML scraping
                console.log("Falling back to HTML scraping...");
                if (fcData.data.html) {
                    const $ = cheerio.load(fcData.data.html);
                    propertyData = extractWithMultipleStrategies($, url, fcData.data.html);
                } else {
                    throw new Error("Failed to map structured data to PropertyData and no HTML available for fallback");
                }
            } else {
                propertyData = mappedData;

                // IMPROVEMENT: Check if description is missing or too short, and try to use markdown
                if ((!propertyData.description || propertyData.description.length < 50 || propertyData.description === "Luxury property in Panama") && fcData.data.markdown) {
                    console.log("Structured description missing or short. Using markdown fallback.");
                    // Remove links and images from markdown to get clean text
                    let cleanMarkdown = fcData.data.markdown
                        .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
                        .replace(/\[([^\]]+)\]\(.*?\)/g, "$1") // Remove links but keep text
                        .replace(/<[^>]*>/g, "") // Remove HTML tags
                        .replace(/\n+/g, "\n") // Normalize newlines
                        .trim();

                    if (cleanMarkdown.length > 50) {
                        propertyData.description = cleanMarkdown.substring(0, 2000); // Limit to 2000 chars
                    }
                }

                // Extract images from HTML if available
                if (fcData.data.html) {
                    const $ = cheerio.load(fcData.data.html);
                    propertyData.images = extractPropertyImages($, url);
                    console.log(`Extracted ${propertyData.images.length} property images`);
                }
            }

        } else {
            // FALLBACK: Use HTML scraping for unsupported sites
            console.log("Using HTML scraping (no schema available)");

            const fcResponse = await fetch("https://api.firecrawl.dev/v0/scrape", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${FIRECRAWL_API_KEY}`
                },
                body: JSON.stringify({
                    url: url,
                    pageOptions: {
                        onlyMainContent: false,
                        includeHtml: true,
                        screenshot: false
                    }
                })
            });

            if (!fcResponse.ok) {
                throw new Error(`FireCrawl API failed: ${fcResponse.status} ${fcResponse.statusText}`);
            }

            const fcData = await fcResponse.json();

            if (!fcData.success || !fcData.data) {
                throw new Error("FireCrawl returned unsuccessful response");
            }

            const html = fcData.data.html || fcData.data.content;
            const $ = cheerio.load(html);

            // ULTRA AGGRESSIVE MULTI-STRATEGY EXTRACTION
            propertyData = extractWithMultipleStrategies($, url, html);

            // EXTRA CLEANING: If FireCrawl provided markdown, use it to pick a cleaner description
            if (fcData.data.markdown && (!propertyData.description || propertyData.description.length < 100)) {
                propertyData.description = fcData.data.markdown.substring(0, 1500);
            }
        }

        // STEP 1: Remove private information (company names, agent info, phone numbers, emails)
        console.log("Removing private information...");
        propertyData.title = removePrivateInfo(propertyData.title);
        propertyData.description = removePrivateInfo(propertyData.description);
        propertyData.location = removePrivateInfo(propertyData.location);
        propertyData.features = propertyData.features.map(f => removePrivateInfo(f)).filter(f => f.length > 0);
        if (propertyData.bedrooms) propertyData.bedrooms = removePrivateInfo(propertyData.bedrooms);
        if (propertyData.bathrooms) propertyData.bathrooms = removePrivateInfo(propertyData.bathrooms);
        if (propertyData.area) propertyData.area = removePrivateInfo(propertyData.area);

        // STEP 2: Translate to English
        propertyData = await translateToEnglish(propertyData);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(propertyData),
        };
    } catch (error) {
        console.error("Scraping error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Failed to scrape property data",
                details: error instanceof Error ? error.message : "Unknown error"
            }),
        };
    }
};

// STRATEGY 1: CSS Selectors
function trySelectors($: ReturnType<typeof cheerio.load>, selectors: string[], attr?: string): string {
    for (const sel of selectors) {
        try {
            if (attr) {
                const val = $(sel).attr(attr);
                if (val && val.trim().length > 0) return cleanText(val);
            } else {
                const val = $(sel).first().text();
                if (val && val.trim().length > 0) return cleanText(val);
            }
        } catch (e) { /* continue */ }
    }
    return "";
}

// STRATEGY 2: Regex Patterns
function tryRegex(html: string, patterns: RegExp[], validator?: (match: string) => boolean): string {
    for (const pattern of patterns) {
        try {
            const matches = html.match(pattern);
            if (matches) {
                for (const match of matches) {
                    if (!validator || validator(match)) {
                        return match.trim();
                    }
                }
            }
        } catch (e) { /* continue */ }
    }
    return "";
}

// STRATEGY 3: JSON-LD Schema
function tryJSONLD($: ReturnType<typeof cheerio.load>, property: string): string {
    try {
        $('script[type="application/ld+json"]').each((_, el) => {
            try {
                const json = JSON.parse($(el).html() || "{}");
                if (json[property]) return json[property];
                if (json["@graph"]) {
                    for (const item of json["@graph"]) {
                        if (item[property]) return item[property];
                    }
                }
            } catch (e) { /* continue */ }
        });
    } catch (e) { /* continue */ }
    return "";
}

// STRATEGY 4: Meta Tags
function tryMetaTags($: ReturnType<typeof cheerio.load>, properties: string[]): string {
    for (const prop of properties) {
        try {
            let val = $(`meta[property="${prop}"]`).attr("content");
            if (val) return cleanText(val);
            val = $(`meta[name="${prop}"]`).attr("content");
            if (val) return cleanText(val);
        } catch (e) { /* continue */ }
    }
    return "";
}

// STRATEGY 5: Text Content Analysis
function findInText($: ReturnType<typeof cheerio.load>, keywords: string[], minLength = 3): string {
    const allText = cleanText($("body").text());
    for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[:\\s]*([^\\n<>]{${minLength},100})`, "i");
        const match = allText.match(regex);
        if (match && match[1]) return cleanText(match[1]);
    }
    return "";
}

function extractWithMultipleStrategies($: ReturnType<typeof cheerio.load>, url: string, html: string): PropertyData {

    // ========== SPECIFIC STRATEGY: ENCUENTRA24 ==========
    if (url.includes("encuentra24.com")) {
        const e24 = extractEncuentra24($, html);
        if (e24.title && e24.price) {
            return {
                title: e24.title,
                price: e24.price,
                location: e24.location || "Panama",
                description: e24.description || "",
                features: e24.features || [],
                images: e24.images || [],
                bedrooms: e24.bedrooms,
                bathrooms: e24.bathrooms,
                area: e24.area,
                source: "Encuentra24"
            };
        }
    }

    // ========== TITLE (6 STRATEGIES) ==========
    let title =
        trySelectors($, ["h1", ".property-title", ".listing-title", "#property-title", "[class*='title']", "[itemprop='name']"]) ||
        tryMetaTags($, ["og:title", "twitter:title", "title"]) ||
        tryJSONLD($, "name") ||
        $("title").text().trim() ||
        "Property Listing";

    title = title.substring(0, 200);

    // ========== PRICE (8 STRATEGIES) ==========
    let price =
        trySelectors($, [".price", ".property-price", ".listing-price", "#price", "[class*='price']", "[class*='Price']", "[itemprop='price']"]) ||
        tryMetaTags($, ["og:price:amount", "product:price:amount"]) ||
        tryJSONLD($, "price") ||
        tryRegex(html, [
            /\$[\s]?[\d,]+(?:\.\d{2})?(?!\d)/g,
            /USD[\s]?[\d,]+/gi,
            /US\$[\s]?[\d,]+/g,
            /Precio[:\s]+\$?[\d,]+/gi,
            /Price[:\s]+\$?[\d,]+/gi
        ], (match) => {
            const num = parseInt(match.replace(/[^\d]/g, ''));
            return num > 10000 && num < 100000000; // Reasonable property price range
        }) ||
        // Remove text analysis for price as it is too risky
        "Contact for Price";

    // ========== LOCATION (7 STRATEGIES) ==========
    let location =
        trySelectors($, [".location", ".property-location", ".address", "[class*='location']", "[class*='address']", "[itemprop='address']"]) ||
        tryMetaTags($, ["og:locality", "og:region", "geo.placename"]) ||
        tryJSONLD($, "address") ||
        "Panama";

    // ========== BEDROOMS (6 STRATEGIES) ==========
    let bedrooms =
        trySelectors($, ["[class*='bedroom']", "[class*='bed']", "[class*='habitacion']", "[itemprop='numberOfRooms']"]) ||
        tryJSONLD($, "numberOfRooms") ||
        tryRegex(html, [
            /(\d+)\s*(?:bed|bedroom|habitacion|recamara|cuarto|dormitorio)s?/gi,
            /(?:bed|bedroom|habitacion|dormitorio)s?[:\s]*(\d+)/gi,
            /(\d+)\s*hab/gi
        ], (match) => {
            const num = parseInt(match.match(/\d+/)?.[0] || "0");
            return num > 0 && num < 20;
        });

    if (bedrooms && !/bed/i.test(bedrooms)) {
        const num = bedrooms.match(/\d+/)?.[0];
        if (num) bedrooms = num + " beds";
    }

    // ========== BATHROOMS (6 STRATEGIES) ==========
    let bathrooms =
        trySelectors($, ["[class*='bathroom']", "[class*='bath']", "[class*='baño']", "[itemprop='numberOfBathroomsTotal']"]) ||
        tryJSONLD($, "numberOfBathroomsTotal") ||
        tryRegex(html, [
            /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|baño|baños)s?/gi,
            /(?:bath|bathroom|baño)s?[:\s]*(\d+(?:\.\d+)?)/gi
        ], (match) => {
            const num = parseFloat(match.match(/\d+(?:\.\d+)?/)?.[0] || "0");
            return num > 0 && num < 20;
        });

    if (bathrooms && !/bath/i.test(bathrooms)) {
        const num = bathrooms.match(/\d+(?:\.\d+)?/)?.[0];
        if (num) bathrooms = num + " baths";
    }

    // ========== AREA (6 STRATEGIES) ==========
    let area =
        trySelectors($, ["[class*='area']", "[class*='size']", "[class*='superficie']", "[itemprop='floorSize']"]) ||
        tryJSONLD($, "floorSize") ||
        tryRegex(html, [
            /(\d+[,\d]*)\s*(?:m2|m²|metros?\s*cuadrados?)/gi,
            /(\d+[,\d]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/gi,
            /(?:area|superficie|tamaño)[:\s]*(\d+[,\d]*)\s*(?:m2|m²)/gi
        ], (match) => {
            const num = parseInt(match.replace(/[^\d]/g, ''));
            return num > 20 && num < 100000; // Reasonable area range
        });

    // ========== DESCRIPTION (7 STRATEGIES) ==========
    // Cleanup HTML before extracting text
    $("script, style, nav, footer, header, noscript, iframe").remove();

    let description =
        trySelectors($, [".description", ".property-description", "[class*='description']", "[itemprop='description']"]) ||
        tryMetaTags($, ["og:description", "twitter:description", "description"]) ||
        tryJSONLD($, "description");

    // Fallback: Get longest paragraph logic (improved)
    if (!description || description.length < 100) {
        let maxLen = 0;
        $("p").each((_, el) => {
            const text = cleanText($(el).text());
            if (text.length > maxLen && text.length > 50 &&
                !text.toLowerCase().includes("cookie") &&
                !text.toLowerCase().includes("privacy") &&
                !text.includes("{")) { // Avoid JS
                maxLen = text.length;
                description = text;
            }
        });
    }

    if (!description) description = "Luxury property in Panama";
    description = description.substring(0, 1500);

    // ========== FEATURES (5 STRATEGIES) ==========
    const features: string[] = [];
    const seenFeatures = new Set<string>();

    // Strategy: Look for UL/LI inside main content areas only
    $("main, .content, #content, .details").find("li").each((_, el) => {
        const text = cleanText($(el).text()).substring(0, 60);
        if (isValidFeature(text) && !seenFeatures.has(text.toLowerCase())) {
            seenFeatures.add(text.toLowerCase());
            features.push(text);
        }
    });

    if (features.length === 0) {
        // Fallback to global LI if safe
        $("li").each((_, el) => {
            const text = cleanText($(el).text()).substring(0, 60);
            if (isValidFeature(text) && !seenFeatures.has(text.toLowerCase()) &&
                !["home", "about", "contact", "login"].includes(text.toLowerCase())) {
                seenFeatures.add(text.toLowerCase());
                features.push(text);
            }
        });
    }

    // ========== IMAGES ==========
    const images = extractPropertyImages($, url);

    return {
        title: cleanText(title),
        price: cleanText(price),
        location: cleanText(location),
        bedrooms: bedrooms ? cleanText(bedrooms) : undefined,
        bathrooms: bathrooms ? cleanText(bathrooms) : undefined,
        area: area ? cleanText(area) : undefined,
        description: cleanText(description),
        features: features.slice(0, 15), // Limit features (already cleaned)
        images: images, // Already limited in extractPropertyImages
        source: new URL(url).hostname
    };
}

function extractEncuentra24($: ReturnType<typeof cheerio.load>, html: string): Partial<PropertyData> {
    const title = cleanText($("h1").first().text());
    const price = cleanText($(".price, [class*='price']").first().text() ||
        $("div:contains('Precio')").next().text());

    const location = cleanText($(".location, [class*='address']").first().text() ||
        $("div:contains('Ubicación')").next().text());

    // Specific to Encuentra24 structure
    const bedrooms = cleanText($(".info-details .bedrooms, .info-details:contains('Recámaras') .value").text());
    const bathrooms = cleanText($(".info-details .bathrooms, .info-details:contains('Baños') .value").text());
    const area = cleanText($(".info-details .area, .info-details:contains('m²') .value").text());

    const description = cleanText($(".description-container, .description").text());

    // Features in Encuentra24 are often in a specific list
    const features: string[] = [];
    $(".amenities li, .features li").each((_, el) => {
        const feature = cleanText($(el).text());
        if (feature) features.push(feature);
    });

    // Images in carousel
    const images: string[] = [];
    $(".gallery-image, .carousel-item img").each((_, el) => {
        const src = $(el).attr("data-src") || $(el).attr("src");
        if (src && src.startsWith("http")) images.push(src);
    });

    return {
        title,
        price,
        location,
        bedrooms,
        bathrooms,
        area,
        description,
        features,
        images
    };
}

function isValidFeature(text: string): boolean {
    if (!text || text.length < 3 || text.length > 100) return false;

    const invalidKeywords = [
        "contacto", "contact", "agente", "agent", "whatsapp", "email",
        "phone", "cookie", "privacy", "terms", "política", "aviso",
        "copyright", "reserved", "rights", "©", "®", "™"
    ];

    const lowerText = text.toLowerCase();
    return !invalidKeywords.some(kw => lowerText.includes(kw));
}
