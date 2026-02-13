import type { Handler, HandlerEvent } from "@netlify/functions";
import * as cheerio from "cheerio";
import FirecrawlApp from '@mendable/firecrawl-js';
import { z } from 'zod';

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
    debugLog?: string[];
}

// Global API Key
const FIRECRAWL_API_KEY = "fc-c3b388c7f1e14ef8a3fa5e3334b71add";

// Response Helpers
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const successResponse = (payload: Record<string, unknown>, statusCode = 200) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(payload),
});

const errorResponse = (message: string, debug: string[], statusCode = 500, details?: string) => ({
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({ error: message, debugLog: debug, details }),
});

// Request-scoped logger helper
function logDebug(debugLog: string[], message: string) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const msg = `[${timestamp}] ${message}`;
    console.log(msg);
    debugLog.push(msg);
}

// Encode/Decode helpers
function decodeHTMLEntities(text: string): string {
    if (!text) return "";
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ');
}

function cleanText(text: string): string {
    if (!text) return '';
    let cleaned = decodeHTMLEntities(text);
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return cleaned;
}

// Remove private information
function removePrivateInfo(text: string): string {
    if (!text) return text;
    let cleaned = text;

    // Remove phone numbers
    cleaned = cleaned.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '');
    cleaned = cleaned.replace(/\d{4}[-.\s]?\d{4}/g, '');

    // Remove emails
    cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '');

    // Remove common real estate terms
    const companies = ['RE/MAX', 'Keller Williams', 'Century 21', 'Sotheby\'s', 'Coldwell Banker'];
    for (const company of companies) {
        const regex = new RegExp(`.*${company}.*`, 'gi');
        cleaned = cleaned.replace(regex, '');
    }

    return cleaned.trim();
}

// Zod Schemas for each domain
const Encunetra24Schema = z.object({
    encuentra24_description: z.string().describe("Description of the property from Encuentra24"),
    encuentra24_amenities: z.array(z.object({
        value: z.string(),
    })).describe("List of amenities from Encuentra24").optional(),
    encuentra24_square_footage: z.string().describe("Square footage (metraje) of the property from Encuentra24").optional(),
    encuentra24_price: z.string().describe("Price of the property from Encuentra24"),
    encuentra24_bedrooms: z.string().describe("Number of bedrooms (recámaras) from Encuentra24").optional(),
    encuentra24_bathrooms: z.string().describe("Number of bathrooms (baños) from Encuentra24").optional(),
    encuentra24_location: z.string().describe("Location of the property").optional(),
    encuentra24_title: z.string().describe("Title of the listing").optional(),
});

const JamesEditionSchema = z.object({
    jamesedition_description: z.string().describe("Detailed description from JamesEdition"),
    jamesedition_amenities: z.array(z.object({
        value: z.string(),
    })).describe("List of amenities from JamesEdition"),
    jamesedition_square_footage: z.number().describe("Square footage from JamesEdition"),
    jamesedition_price_usd: z.number().describe("Price converted to USD from JamesEdition"),
    jamesedition_bedrooms: z.number().describe("Number of bedrooms from JamesEdition"),
    jamesedition_bathrooms: z.number().describe("Number of bathrooms from JamesEdition").optional(),
    jamesedition_location: z.string().describe("Location of the property").optional(),
    jamesedition_title: z.string().describe("Title of the listing").optional(),
});

const CompreoalquileSchema = z.object({
    description: z.string().describe("Description of the property"),
    amenities: z.array(z.object({
        value: z.string(),
    })).describe("List of amenities").optional(),
    square_footage: z.number().describe("Square footage of the property").optional(),
    price: z.number().describe("Price of the property"),
    bedrooms: z.number().describe("Number of bedrooms").optional(),
    bathrooms: z.number().describe("Number of bathrooms").optional(),
    location: z.string().describe("Location of the property").optional(),
    title: z.string().describe("Title of the listing").optional(),
});

const MLSAcobirSchema = z.object({
    description: z.string().describe("Description of the property"),
    amenities: z.array(z.object({
        value: z.string(),
    })).describe("List of amenities"),
    square_footage: z.number().describe("Square footage of the property"),
    price: z.number().describe("Price of the property"),
    bedrooms: z.number().describe("Number of bedrooms").optional(),
    bathrooms: z.number().describe("Number of bathrooms").optional(),
    location: z.string().describe("Property location").optional(),
    title: z.string().describe("MLS listing title").optional(),
});

// Translation Helper
async function translateToEnglish(data: PropertyData): Promise<PropertyData> {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) return data;

    try {
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
                    content: 'Translate the following property data to English. JSON only.'
                }, {
                    role: 'user',
                    content: JSON.stringify(data)
                }],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) throw new Error("Translation failed");
        const result = await response.json();
        const translated = JSON.parse(result.choices[0].message.content);
        return { ...data, ...translated };
    } catch (e) {
        return data;
    }
}

// STRATEGY 1: CSS Selectors
function trySelectors($: ReturnType<typeof cheerio.load>, selectors: string[], attr?: string): string {
    for (const sel of selectors) {
        try {
            if (attr) {
                const val = $(sel).attr(attr);
                if (val && val.trim().length > 0) return val.trim();
            } else {
                const val = $(sel).text();
                // Special handling for meta description to avoid "undefined" or generic text
                if (sel.includes('meta') && val.trim().length > 0) return val.trim();

                // For other text nodes, basic validation
                if (val && val.trim().length > 0) return val.trim();
            }
        } catch (e) {
            // Ignore selector errors
        }
    }
    return '';
}

function extractWithMultipleStrategies($: ReturnType<typeof cheerio.load>, url: string, html: string, debugLog: string[]): Partial<PropertyData> {
    const propertyData: Partial<PropertyData> = {
        title: "",
        price: "",
        location: "",
        description: "",
        features: [],
        images: [],
        bedrooms: "",
        bathrooms: "",
        area: "",
        source: "Unknown"
    };

    // Title
    propertyData.title = trySelectors($, [
        'h1.title', 'h1.property-title', '.listing-title', 'h1',
        'meta[property="og:title"]', 'title'
    ]);

    // Description
    propertyData.description = trySelectors($, [
        '.property-description', '.description', '#description',
        'meta[property="og:description"]', 'meta[name="description"]'
    ], 'content');

    return propertyData;
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

// Main Handler
export const handler: Handler = async (event: HandlerEvent) => {
    const debugLogArray: string[] = [];
    logDebug(debugLogArray, "Starting scrape request (SDK Version)");

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers: corsHeaders, body: "" };
    if (event.httpMethod !== "POST") return errorResponse("Method not allowed", debugLogArray, 405);

    try {
        const { url } = JSON.parse(event.body || "{}");
        if (!url) return errorResponse("URL is required", debugLogArray, 400);

        let propertyData: PropertyData = {
            title: '', price: '', location: '', description: '', features: [],
            images: [], bedrooms: '', bathrooms: '', area: '', source: 'Unknown'
        };

        const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
        const hostname = new URL(url).hostname;

        logDebug(debugLogArray, `Identifying schema for ${hostname}`);

        try {
            if (hostname.includes("encuentra24.com")) {
                const result = await app.agent({
                    prompt: "Extraer datos de la propiedad en la URL proporcionada, incluyendo descripción, amenidades, metraje, precio, cantidad de recámaras o detalles técnicos relevantes. Excluir números de contacto.",
                    schema: Encunetra24Schema,
                    urls: [url],
                    model: 'spark-1-mini',
                });

                if (result.success && result.data) {
                    const data = result.data as z.infer<typeof Encunetra24Schema>;
                    propertyData = {
                        title: data.encuentra24_title || "Encuentra24 Property",
                        price: data.encuentra24_price || "Contact for Price",
                        location: data.encuentra24_location || "Panama",
                        description: data.encuentra24_description,
                        features: data.encuentra24_amenities?.map(a => a.value) || [],
                        bedrooms: data.encuentra24_bedrooms || "",
                        bathrooms: data.encuentra24_bathrooms || "",
                        area: data.encuentra24_square_footage || "",
                        images: [],
                        source: "Encuentra24"
                    };
                }
            } else if (hostname.includes("jamesedition.com")) {
                const result = await app.agent({
                    prompt: "Extraer datos de la propiedad desde la URL de JamesEdition.",
                    schema: JamesEditionSchema,
                    urls: [url],
                    model: 'spark-1-mini',
                });
                if (result.success && result.data) {
                    const data = result.data as z.infer<typeof JamesEditionSchema>;
                    propertyData = {
                        title: data.jamesedition_title || "JamesEdition Property",
                        price: data.jamesedition_price_usd ? `$${data.jamesedition_price_usd}` : "Contact for Price",
                        location: data.jamesedition_location || "Panama",
                        description: data.jamesedition_description,
                        features: data.jamesedition_amenities?.map(a => a.value) || [],
                        bedrooms: data.jamesedition_bedrooms?.toString() || "",
                        bathrooms: data.jamesedition_bathrooms?.toString() || "",
                        area: data.jamesedition_square_footage?.toString() || "",
                        images: [],
                        source: "JamesEdition"
                    };
                }
            } else if (hostname.includes("compreoalquile.com")) {
                const result = await app.agent({
                    prompt: "Extraer datos técnicos de la propiedad en Compreoalquile.",
                    schema: CompreoalquileSchema,
                    urls: [url],
                    model: 'spark-1-mini',
                });
                if (result.success && result.data) {
                    const data = result.data as z.infer<typeof CompreoalquileSchema>;
                    propertyData = {
                        title: data.title || "Compreoalquile Property",
                        price: data.price ? `$${data.price}` : "Contact for Price",
                        location: data.location || "Panama",
                        description: data.description,
                        features: data.amenities?.map(a => a.value) || [],
                        bedrooms: data.bedrooms?.toString() || "",
                        bathrooms: data.bathrooms?.toString() || "",
                        area: data.square_footage?.toString() || "",
                        images: [],
                        source: "Compreoalquile"
                    };
                }
            } else if (hostname.includes("mlsacobir.com")) {
                const result = await app.agent({
                    prompt: "Extraer datos de la propiedad desde MLS Acobir.",
                    schema: MLSAcobirSchema,
                    urls: [url],
                    model: 'spark-1-mini',
                });
                if (result.success && result.data) {
                    const data = result.data as z.infer<typeof MLSAcobirSchema>;
                    propertyData = {
                        title: data.title || "MLS Acobir Property",
                        price: data.price ? `$${data.price}` : "Contact for Price",
                        location: data.location || "Panama",
                        description: data.description,
                        features: data.amenities?.map(a => a.value) || [],
                        bedrooms: data.bedrooms?.toString() || "",
                        bathrooms: data.bathrooms?.toString() || "",
                        area: data.square_footage?.toString() || "",
                        images: [],
                        source: "MLS Acobir"
                    };
                }
            } else {
                throw new Error("Unsupported domain for agent extraction");
            }

            logDebug(debugLogArray, "Agent extraction successful");

            // Extract Images via fallback scrape (Agent doesn't return images reliably)
            const scrapeResult = await app.scrapeUrl(url, { formats: ['html'] });
            if (scrapeResult.success && scrapeResult.html) {
                const $ = cheerio.load(scrapeResult.html);
                // Reuse image extraction logic (simplification of previous function)
                const imgs: string[] = [];
                $('img').each((i, el) => {
                    const src = $(el).attr('src');
                    if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
                        imgs.push(src);
                    }
                });
                // Filter top 10 unique
                propertyData.images = [...new Set(imgs)].slice(0, 15);
            }

        } catch (sdkError) {
            logDebug(debugLogArray, `SDK/Agent failed: ${sdkError}. Falling back to Direct Fetch.`);

            // FINAL FALLBACK: Direct Fetch
            const directResponse = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
                }
            });

            if (directResponse.ok) {
                const html = await directResponse.text();
                const $ = cheerio.load(html);

                // Generic Extraction
                const fallbackData = extractWithMultipleStrategies($, url, html, debugLogArray);
                propertyData = { ...propertyData, ...fallbackData };

                // Try to find price if missing
                if (!propertyData.price) {
                    const priceMatch = html.match(/\$[\d,]+\.?\d*/);
                    if (priceMatch) propertyData.price = priceMatch[0];
                }

                logDebug(debugLogArray, "Direct fetch fallback successful");
            } else {
                throw new Error("All extraction methods failed");
            }
        }

        // Cleanup
        propertyData.title = removePrivateInfo(propertyData.title);
        propertyData.description = removePrivateInfo(propertyData.description);
        propertyData = await translateToEnglish(propertyData);
        propertyData.debugLog = debugLogArray;

        return successResponse(propertyData as unknown as Record<string, unknown>);

    } catch (error) {
        console.error("Handler error:", error);
        return errorResponse(
            "Failed to scrape property data",
            debugLogArray,
            500,
            error instanceof Error ? error.message : "Undefined error"
        );
    }
};
