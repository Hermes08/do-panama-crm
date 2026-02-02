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
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        let propertyData: PropertyData;

        if (url.includes("mlsacobir.com")) {
            propertyData = scrapeMLS($, url, html);
        } else if (url.includes("encuentra24.com")) {
            propertyData = scrapeEncuentra24($, url, html);
        } else if (url.includes("jamesedition.com")) {
            propertyData = scrapeJamesEdition($, url, html);
        } else {
            propertyData = scrapeGeneric($, url, html);
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

// Helper function to extract data from entire HTML
function extractFromHTML(html: string, pattern: RegExp): string | null {
    const match = html.match(pattern);
    return match ? match[0] : null;
}

// Generic scraper that works for any property site
function scrapeGeneric($: ReturnType<typeof cheerio.load>, url: string, html: string): PropertyData {
    // Title - try h1, then any heading, then meta tags
    let title = $("h1").first().text().trim();
    if (!title) title = $("h2, h3").first().text().trim();
    if (!title) title = $('meta[property="og:title"]').attr("content") || "";
    if (!title) title = $("title").text().trim();

    // Price - scan entire HTML for price patterns
    let price = "";
    const pricePatterns = [
        /\$[\d,]+(?:\.\d{2})?/,
        /USD[\s]?[\d,]+/i,
        /US\$[\d,]+/,
        /Precio[:\s]+\$?[\d,]+/i,
        /Price[:\s]+\$?[\d,]+/i
    ];

    for (const pattern of pricePatterns) {
        const match = html.match(pattern);
        if (match) {
            price = match[0];
            break;
        }
    }
    if (!price) price = "Contact for Price";

    // Location - try multiple selectors and meta tags
    let location = $('[class*="location"], [class*="address"], [class*="ubicacion"]').first().text().trim();
    if (!location) location = $('meta[property="og:locality"]').attr("content") || "";
    if (!location) {
        const locationMatch = html.match(/Panamá|Panama City|Costa del Este|Punta Pacifica|San Francisco|El Cangrejo/i);
        location = locationMatch ? locationMatch[0] : "Panama";
    }

    // Bedrooms - scan for patterns
    let bedrooms = "";
    const bedroomPatterns = [
        /(\d+)\s*(?:bed|bedroom|habitacion|recamara|cuarto)/i,
        /(?:bed|bedroom|habitacion)[:\s]*(\d+)/i
    ];
    for (const pattern of bedroomPatterns) {
        const match = html.match(pattern);
        if (match) {
            bedrooms = match[1] + " beds";
            break;
        }
    }

    // Bathrooms - scan for patterns
    let bathrooms = "";
    const bathroomPatterns = [
        /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|baño)/i,
        /(?:bath|bathroom|baño)[:\s]*(\d+(?:\.\d+)?)/i
    ];
    for (const pattern of bathroomPatterns) {
        const match = html.match(pattern);
        if (match) {
            bathrooms = match[1] + " baths";
            break;
        }
    }

    // Area - scan for patterns
    let area = "";
    const areaPatterns = [
        /(\d+[,\d]*)\s*(?:m2|m²|sq\.?\s*ft|sqft|square\s*(?:feet|meters))/i,
        /(?:area|superficie)[:\s]*(\d+[,\d]*)\s*(?:m2|m²)/i
    ];
    for (const pattern of areaPatterns) {
        const match = html.match(pattern);
        if (match) {
            area = match[0];
            break;
        }
    }

    // Description - get longest paragraph
    let description = "";
    let maxLength = 0;
    $("p").each((_, el) => {
        const text = $(el).text().trim();
        if (text.length > maxLength && text.length > 100) {
            maxLength = text.length;
            description = text;
        }
    });
    if (!description) description = $('meta[property="og:description"]').attr("content") || "Luxury property in Panama";

    // Features - extract from lists and common patterns
    const features: string[] = [];
    $("li, [class*='feature'], [class*='amenity'], [class*='caracteristica']").each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 3 && text.length < 100 &&
            !text.toLowerCase().includes("contacto") &&
            !text.toLowerCase().includes("agente") &&
            !text.toLowerCase().includes("whatsapp") &&
            !text.toLowerCase().includes("email")) {
            if (!features.includes(text)) {
                features.push(text);
            }
        }
    });

    // Images - get all images that look like property photos
    const images: string[] = [];
    $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy");
        const alt = $(el).attr("alt") || "";

        if (src &&
            !src.includes("logo") &&
            !src.includes("icon") &&
            !src.includes("avatar") &&
            !src.includes("placeholder") &&
            (src.includes("property") || src.includes("photo") || src.includes("image") ||
                src.includes("img") || alt.toLowerCase().includes("property") ||
                src.match(/\.(jpg|jpeg|png|webp)/i))) {
            const fullSrc = src.startsWith("http") ? src : new URL(src, url).href;
            if (!images.includes(fullSrc)) {
                images.push(fullSrc);
            }
        }
    });

    return {
        title: title || "Property Listing",
        price,
        location,
        bedrooms,
        bathrooms,
        area,
        description,
        features: features.slice(0, 20),
        images: images.slice(0, 15),
        source: new URL(url).hostname
    };
}

function scrapeMLS($: ReturnType<typeof cheerio.load>, url: string, html: string): PropertyData {
    const generic = scrapeGeneric($, url, html);
    generic.source = "MLS ACOBIR";
    return generic;
}

function scrapeEncuentra24($: ReturnType<typeof cheerio.load>, url: string, html: string): PropertyData {
    const generic = scrapeGeneric($, url, html);
    generic.source = "Encuentra24";
    return generic;
}

function scrapeJamesEdition($: ReturnType<typeof cheerio.load>, url: string, html: string): PropertyData {
    const generic = scrapeGeneric($, url, html);
    generic.source = "James Edition";
    return generic;
}
