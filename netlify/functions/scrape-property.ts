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

        // Use FireCrawl API for robust scraping
        const FIRECRAWL_API_KEY = "fc-c3b388c7f1e14ef8a3fa5e3334b71add"; // Provided by user

        console.log("Scraping with FireCrawl:", url);

        const fcResponse = await fetch("https://api.firecrawl.dev/v0/scrape", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${FIRECRAWL_API_KEY}`
            },
            body: JSON.stringify({
                url: url,
                pageOptions: {
                    onlyMainContent: false, // We need full HTML for specific selectors
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

        const html = fcData.data.html || fcData.data.content; // Fallback to content if HTML missing
        const $ = cheerio.load(html);

        // ULTRA AGGRESSIVE MULTI-STRATEGY EXTRACTION
        const propertyData = extractWithMultipleStrategies($, url, html);

        // EXTRA CLEANING: If FireCrawl provided markdown, use it to pick a cleaner description
        if (fcData.data.markdown && (!propertyData.description || propertyData.description.length < 100)) {
            propertyData.description = fcData.data.markdown.substring(0, 1500);
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
            const text = $(el).text().trim();
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
        const text = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 60);
        if (isValidFeature(text) && !seenFeatures.has(text.toLowerCase())) {
            seenFeatures.add(text.toLowerCase());
            features.push(text);
        }
    });

    if (features.length === 0) {
        // Fallback to global LI if safe
        $("li").each((_, el) => {
            const text = $(el).text().trim().replace(/\s+/g, ' ').substring(0, 60);
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
        title,
        price,
        location,
        bedrooms,
        bathrooms,
        area,
        description,
        features: features.slice(0, 15), // Limit features
        images: images.slice(0, 10), // Limit images
        source: new URL(url).hostname
    };
}

function extractEncuentra24($: ReturnType<typeof cheerio.load>, html: string): Partial<PropertyData> {
    const title = $("h1").first().text().trim();
    const price = $(".price, [class*='price']").first().text().trim() ||
        $("div:contains('Precio')").next().text().trim();

    const location = $(".location, [class*='address']").first().text().trim() ||
        $("div:contains('Ubicación')").next().text().trim();

    // Specific to Encuentra24 structure
    const bedrooms = $(".info-details .bedrooms, .info-details:contains('Recámaras') .value").text().trim();
    const bathrooms = $(".info-details .bathrooms, .info-details:contains('Baños') .value").text().trim();
    const area = $(".info-details .area, .info-details:contains('m²') .value").text().trim();

    const description = $(".description-container, .description").text().trim();

    // Features in Encuentra24 are often in a specific list
    const features: string[] = [];
    $(".amenities li, .features li").each((_, el) => {
        features.push($(el).text().trim());
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
