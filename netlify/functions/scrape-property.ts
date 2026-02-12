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

// Extraction schemas for different real estate websites
const EXTRACTION_SCHEMAS: Record<string, any> = {
    'encuentra24.com': {
        type: "object",
        properties: {
            titulo: { type: "string", description: "Título del listado" },
            precio: { type: "string", description: "Precio de la propiedad" },
            ubicacion: { type: "string", description: "Ubicación de la propiedad" },
            detalles: {
                type: "array",
                description: "Detalles de la propiedad (habitaciones, baños, área)",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Amenidades de la propiedad",
                items: { type: "string" }
            },
            descripcion: { type: "string", description: "Descripción completa de la propiedad" }
        },
        required: ["titulo", "precio"]
    },
    'jamesedition.com': {
        type: "object",
        properties: {
            titulo: { type: "string", description: "Título del listado" },
            precio: { type: "string", description: "Precio de la propiedad" },
            ubicacion: { type: "string", description: "Ubicación de la propiedad" },
            descripcion: { type: "string", description: "Descripción de la propiedad" },
            caracteristicas: {
                type: "array",
                description: "Características de la propiedad",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Amenidades de la propiedad",
                items: { type: "string" }
            }
        },
        required: ["titulo", "precio"]
    },
    'compreoalquile.com': {
        type: "object",
        properties: {
            titulo: { type: "string", description: "Título del listado" },
            precio: { type: "string", description: "Precio de la propiedad" },
            ubicacion: { type: "string", description: "Ubicación de la propiedad" },
            detalles: {
                type: "array",
                description: "Detalles de la propiedad",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Amenidades de la propiedad",
                items: { type: "string" }
            }
        },
        required: ["titulo", "precio"]
    },
    'mlsacobir.com': {
        type: "object",
        properties: {
            titulo: { type: "string", description: "Título del listado" },
            precio: { type: "string", description: "Precio de la propiedad" },
            ubicacion: { type: "string", description: "Ubicación de la propiedad" },
            descripcion: { type: "string", description: "Descripción de la propiedad" },
            caracteristicas: {
                type: "array",
                description: "Características de la propiedad",
                items: { type: "string" }
            },
            amenidades: {
                type: "array",
                description: "Amenidades de la propiedad",
                items: { type: "string" }
            }
        },
        required: ["titulo", "precio"]
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

    const allDetails = [
        ...(data.detalles || []),
        ...(data.caracteristicas || [])
    ];

    for (const detail of allDetails) {
        const detailLower = detail.toLowerCase();

        // Bedrooms
        if (!bedrooms && /\d+\s*(hab|rec[aá]mara|bedroom|cuarto|dormitorio)/i.test(detail)) {
            bedrooms = detail;
        }

        // Bathrooms
        if (!bathrooms && /\d+(\.\d+)?\s*(ba[ñn]o|bathroom)/i.test(detail)) {
            bathrooms = detail;
        }

        // Area
        if (!area && /\d+[,\d]*\s*(m[2²]|sq\.?\s*ft|metro)/i.test(detail)) {
            area = detail;
        }
    }

    return {
        title: cleanText(title || "Property Listing"),
        price: cleanText(price || "Contact for Price"),
        location: cleanText(data.ubicacion || data.location || "Panama"),
        bedrooms,
        bathrooms,
        area,
        description: cleanText(data.descripcion || data.description || title || "Luxury property in Panama"),
        features: (data.amenidades || data.amenities || data.caracteristicas || data.features || []).map((f: string) => cleanText(f)),
        images: [], // Images will be extracted separately
        source: hostname
    };
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

                // Extract images from HTML if available
                if (fcData.data.html) {
                    const $ = cheerio.load(fcData.data.html);
                    const images: string[] = [];
                    const seenImages = new Set<string>();

                    // OG Image
                    const ogImg = $('meta[property="og:image"]').attr('content');
                    if (ogImg && !seenImages.has(ogImg)) {
                        images.push(ogImg);
                        seenImages.add(ogImg);
                    }

                    // Gallery Images
                    $("img").each((_, el) => {
                        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
                        if (src && src.startsWith("http") && !seenImages.has(src)) {
                            if (!src.includes("logo") && !src.includes("icon") && !src.includes("avatar")) {
                                images.push(src);
                                seenImages.add(src);
                            }
                        }
                    });

                    propertyData.images = images.slice(0, 10);
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
        const images: string[] = [];
        const seenImages = new Set<string>();

        // 1. OG Image
        const ogImg = $('meta[property="og:image"]').attr('content');
        if (ogImg && !seenImages.has(ogImg)) {
            images.push(ogImg);
            seenImages.add(ogImg);
        }

        // 2. Gallery Images (Generic)
        $("img").each((_, el) => {
            const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-original");
            if (src && src.startsWith("http") && !seenImages.has(src)) {
                // Filter out small icons/logos
                if (!src.includes("logo") && !src.includes("icon") && !src.includes("avatar")) {
                    images.push(src);
                    seenImages.add(src);
                }
            }
        });

        return {
            title: cleanText(title),
            price: cleanText(price),
            location: cleanText(location),
            bedrooms: bedrooms ? cleanText(bedrooms) : undefined,
            bathrooms: bathrooms ? cleanText(bathrooms) : undefined,
            area: area ? cleanText(area) : undefined,
            description: cleanText(description),
            features: features.slice(0, 15), // Limit features (already cleaned)
            images: images.slice(0, 10), // Limit images
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
