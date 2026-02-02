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

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'max-age=0'
            }
        });

        const html = await response.text();
        const $ = cheerio.load(html);

        // ULTRA AGGRESSIVE MULTI-STRATEGY EXTRACTION
        const propertyData = extractWithMultipleStrategies($, url, html);

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
                if (val && val.trim().length > 0) return val.trim();
            } else {
                const val = $(sel).first().text().trim();
                if (val && val.length > 0) return val;
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
            if (val) return val.trim();
            val = $(`meta[name="${prop}"]`).attr("content");
            if (val) return val.trim();
        } catch (e) { /* continue */ }
    }
    return "";
}

// STRATEGY 5: Text Content Analysis
function findInText($: ReturnType<typeof cheerio.load>, keywords: string[], minLength = 3): string {
    const allText = $("body").text();
    for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[:\\s]*([^\\n<>]{${minLength},100})`, "i");
        const match = allText.match(regex);
        if (match && match[1]) return match[1].trim();
    }
    return "";
}

function extractWithMultipleStrategies($: ReturnType<typeof cheerio.load>, url: string, html: string): PropertyData {

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
        findInText($, ["Price", "Precio", "Cost", "Costo"]) ||
        "Contact for Price";

    // ========== LOCATION (7 STRATEGIES) ==========
    let location =
        trySelectors($, [".location", ".property-location", ".address", "[class*='location']", "[class*='address']", "[itemprop='address']"]) ||
        tryMetaTags($, ["og:locality", "og:region", "geo.placename"]) ||
        tryJSONLD($, "address") ||
        tryRegex(html, [
            /(?:Panamá|Panama City|Costa del Este|Punta Pacifica|San Francisco|El Cangrejo|Casco Viejo|Clayton|Albrook|Betania|Bella Vista|Obarrio|Marbella|Costa Sur|Condado del Rey|Tocumen|Las Cumbres|Arraijan|La Chorrera|Coronado|Buenaventura|Playa Blanca|Santa Clara|Pedasí|Boquete|David|Chitré|Santiago|Colón)[,\s]*/i
        ]) ||
        findInText($, ["Location", "Ubicación", "Address", "Dirección"]) ||
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
        }) ||
        findInText($, ["Bedrooms", "Habitaciones", "Dormitorios", "Beds"]);

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
        }) ||
        findInText($, ["Bathrooms", "Baños", "Baths"]);

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
        }) ||
        findInText($, ["Area", "Área", "Size", "Tamaño", "Superficie"]);

    // ========== DESCRIPTION (7 STRATEGIES) ==========
    let description =
        trySelectors($, [".description", ".property-description", "[class*='description']", "[itemprop='description']"]) ||
        tryMetaTags($, ["og:description", "twitter:description", "description"]) ||
        tryJSONLD($, "description");

    // Fallback: Get longest paragraph
    if (!description || description.length < 100) {
        let maxLen = 0;
        $("p").each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > maxLen && text.length > 50 &&
                !text.toLowerCase().includes("cookie") &&
                !text.toLowerCase().includes("privacy")) {
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

    // Strategy 1: List items
    $("li").each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 60);
        if (isValidFeature(text) && !seenFeatures.has(text.toLowerCase())) {
            seenFeatures.add(text.toLowerCase());
            features.push(text);
        }
    });

    // Strategy 2: Feature/amenity classes
    $("[class*='feature'], [class*='amenity'], [class*='caracteristica']").each((_, el) => {
        const text = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 60);
        if (isValidFeature(text) && !seenFeatures.has(text.toLowerCase())) {
            seenFeatures.add(text.toLowerCase());
            features.push(text);
        }
    });

    // Strategy 3: Bullet points in text
    const bulletMatches = html.match(/[•●■▪▸►]\s*([^\n<>]{3,60})/g);
    if (bulletMatches) {
        bulletMatches.forEach(match => {
            const text = match.replace(/[•●■▪▸►]\s*/, '').trim();
            if (isValidFeature(text) && !seenFeatures.has(text.toLowerCase())) {
                seenFeatures.add(text.toLowerCase());
                features.push(text);
            }
        });
    }

    return {
        title,
        price,
        location,
        bedrooms,
        bathrooms,
        area,
        description,
        features: features.slice(0, 25),
        images: [], // User will upload images manually
        source: new URL(url).hostname
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
