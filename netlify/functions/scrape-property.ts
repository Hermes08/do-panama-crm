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
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });
        const html = await response.text();
        const $ = cheerio.load(html);

        // ULTRA AGGRESSIVE EXTRACTION - Get EVERYTHING
        const propertyData = extractAllData($, url, html);

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

function extractAllData($: ReturnType<typeof cheerio.load>, url: string, html: string): PropertyData {
    // ========== TITLE ==========
    let title = "";
    const titleSelectors = [
        "h1", ".property-title", ".listing-title", "#property-title",
        "[class*='title']", "[class*='Title']", "[id*='title']",
        "meta[property='og:title']", "meta[name='title']", "title"
    ];

    for (const sel of titleSelectors) {
        if (sel.startsWith("meta")) {
            const val = $(sel).attr("content");
            if (val && val.length > 5) { title = val; break; }
        } else {
            const val = $(sel).first().text().trim();
            if (val && val.length > 5) { title = val; break; }
        }
    }
    if (!title) title = "Property Listing";

    // ========== PRICE ==========
    let price = "";
    const priceSelectors = [
        ".price", ".property-price", ".listing-price", "#price",
        "[class*='price']", "[class*='Price']", "[class*='precio']",
        "[itemprop='price']", "meta[property='og:price:amount']"
    ];

    for (const sel of priceSelectors) {
        if (sel.startsWith("meta")) {
            const val = $(sel).attr("content");
            if (val) { price = "$" + val; break; }
        } else {
            const val = $(sel).first().text().trim();
            if (val && /[\$\d]/.test(val)) { price = val; break; }
        }
    }

    // Regex fallback for price
    if (!price) {
        const pricePatterns = [
            /\$[\s]?[\d,]+(?:\.\d{2})?/g,
            /USD[\s]?[\d,]+/gi,
            /US\$[\s]?[\d,]+/g,
            /Precio[:\s]+\$?[\d,]+/gi,
            /Price[:\s]+\$?[\d,]+/gi,
            /[\d,]+\s*(?:USD|usd)/gi
        ];

        for (const pattern of pricePatterns) {
            const matches = html.match(pattern);
            if (matches && matches.length > 0) {
                // Get the largest number (likely the actual price)
                const nums = matches.map(m => {
                    const num = m.replace(/[^\d]/g, '');
                    return { text: m, num: parseInt(num) };
                }).filter(x => x.num > 1000);

                if (nums.length > 0) {
                    nums.sort((a, b) => b.num - a.num);
                    price = nums[0].text;
                    break;
                }
            }
        }
    }
    if (!price) price = "Contact for Price";

    // ========== LOCATION ==========
    let location = "";
    const locationSelectors = [
        ".location", ".property-location", ".address", "[class*='location']",
        "[class*='Location']", "[class*='address']", "[class*='Address']",
        "[class*='ubicacion']", "meta[property='og:locality']",
        "[itemprop='address']", "[itemprop='addressLocality']"
    ];

    for (const sel of locationSelectors) {
        if (sel.startsWith("meta")) {
            const val = $(sel).attr("content");
            if (val && val.length > 2) { location = val; break; }
        } else {
            const val = $(sel).first().text().trim();
            if (val && val.length > 2) { location = val; break; }
        }
    }

    if (!location) {
        const locationMatch = html.match(/(?:Panamá|Panama City|Costa del Este|Punta Pacifica|San Francisco|El Cangrejo|Casco Viejo|Clayton|Albrook|Betania|Bella Vista|Obarrio|Marbella|Costa Sur|Condado del Rey|Tocumen|Las Cumbres|Arraijan|La Chorrera|Coronado|Buenaventura|Playa Blanca|Santa Clara|Pedasí|Boquete|David|Chitré|Santiago|Colón)/i);
        location = locationMatch ? locationMatch[0] : "Panama";
    }

    // ========== BEDROOMS ==========
    let bedrooms = "";
    const bedroomSelectors = [
        "[class*='bedroom']", "[class*='Bedroom']", "[class*='bed']",
        "[class*='habitacion']", "[itemprop='numberOfRooms']"
    ];

    for (const sel of bedroomSelectors) {
        const val = $(sel).first().text().trim();
        const match = val.match(/(\d+)/);
        if (match) { bedrooms = match[1] + " beds"; break; }
    }

    if (!bedrooms) {
        const bedroomPatterns = [
            /(\d+)\s*(?:bed|bedroom|habitacion|recamara|cuarto|dormitorio)s?/gi,
            /(?:bed|bedroom|habitacion|dormitorio)s?[:\s]*(\d+)/gi,
            /(\d+)\s*hab/gi
        ];

        for (const pattern of bedroomPatterns) {
            const match = html.match(pattern);
            if (match) {
                const num = match[0].match(/\d+/);
                if (num && parseInt(num[0]) > 0 && parseInt(num[0]) < 20) {
                    bedrooms = num[0] + " beds";
                    break;
                }
            }
        }
    }

    // ========== BATHROOMS ==========
    let bathrooms = "";
    const bathroomSelectors = [
        "[class*='bathroom']", "[class*='Bathroom']", "[class*='bath']",
        "[class*='baño']", "[itemprop='numberOfBathroomsTotal']"
    ];

    for (const sel of bathroomSelectors) {
        const val = $(sel).first().text().trim();
        const match = val.match(/(\d+(?:\.\d+)?)/);
        if (match) { bathrooms = match[1] + " baths"; break; }
    }

    if (!bathrooms) {
        const bathroomPatterns = [
            /(\d+(?:\.\d+)?)\s*(?:bath|bathroom|baño|baños)s?/gi,
            /(?:bath|bathroom|baño)s?[:\s]*(\d+(?:\.\d+)?)/gi
        ];

        for (const pattern of bathroomPatterns) {
            const match = html.match(pattern);
            if (match) {
                const num = match[0].match(/\d+(?:\.\d+)?/);
                if (num && parseFloat(num[0]) > 0 && parseFloat(num[0]) < 20) {
                    bathrooms = num[0] + " baths";
                    break;
                }
            }
        }
    }

    // ========== AREA ==========
    let area = "";
    const areaSelectors = [
        "[class*='area']", "[class*='Area']", "[class*='size']",
        "[class*='superficie']", "[itemprop='floorSize']"
    ];

    for (const sel of areaSelectors) {
        const val = $(sel).first().text().trim();
        if (val && /\d+/.test(val) && /(m2|m²|sq|ft)/i.test(val)) {
            area = val;
            break;
        }
    }

    if (!area) {
        const areaPatterns = [
            /(\d+[,\d]*)\s*(?:m2|m²|metros?\s*cuadrados?)/gi,
            /(\d+[,\d]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/gi,
            /(?:area|superficie|tamaño)[:\s]*(\d+[,\d]*)\s*(?:m2|m²)/gi
        ];

        for (const pattern of areaPatterns) {
            const match = html.match(pattern);
            if (match && match[0]) {
                area = match[0];
                break;
            }
        }
    }

    // ========== DESCRIPTION ==========
    let description = "";
    const descSelectors = [
        ".description", ".property-description", "[class*='description']",
        "[class*='Description']", "[itemprop='description']",
        "meta[property='og:description']", "meta[name='description']"
    ];

    for (const sel of descSelectors) {
        if (sel.startsWith("meta")) {
            const val = $(sel).attr("content");
            if (val && val.length > 50) { description = val; break; }
        } else {
            const val = $(sel).first().text().trim();
            if (val && val.length > 50) { description = val; break; }
        }
    }

    // Get longest paragraph as fallback
    if (!description || description.length < 100) {
        let maxLen = 0;
        $("p").each((_, el) => {
            const text = $(el).text().trim();
            if (text.length > maxLen && text.length > 50) {
                maxLen = text.length;
                description = text;
            }
        });
    }

    if (!description) description = "Luxury property in Panama";

    // ========== FEATURES ==========
    const features: string[] = [];
    const featureSelectors = [
        "li", ".feature", ".amenity", "[class*='feature']",
        "[class*='amenity']", "[class*='caracteristica']"
    ];

    const seenFeatures = new Set<string>();
    for (const sel of featureSelectors) {
        $(sel).each((_, el) => {
            const text = $(el).text().trim();
            const cleanText = text.replace(/\s+/g, ' ').substring(0, 50);

            if (cleanText.length > 3 && cleanText.length < 100 &&
                !cleanText.toLowerCase().includes("contacto") &&
                !cleanText.toLowerCase().includes("agente") &&
                !cleanText.toLowerCase().includes("whatsapp") &&
                !cleanText.toLowerCase().includes("email") &&
                !cleanText.toLowerCase().includes("phone") &&
                !cleanText.toLowerCase().includes("cookie") &&
                !seenFeatures.has(cleanText.toLowerCase())) {

                seenFeatures.add(cleanText.toLowerCase());
                features.push(cleanText);

                if (features.length >= 25) return false; // Stop after 25
            }
        });
        if (features.length >= 15) break;
    }

    // ========== IMAGES ==========
    const images: string[] = [];
    const seenImages = new Set<string>();

    $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy") ||
            $(el).attr("data-original") || $(el).attr("data-lazy-src");
        const alt = $(el).attr("alt") || "";

        if (src &&
            !src.includes("logo") &&
            !src.includes("icon") &&
            !src.includes("avatar") &&
            !src.includes("placeholder") &&
            !src.includes("sprite") &&
            !src.includes("blank") &&
            !src.includes("1x1") &&
            !src.endsWith(".svg") &&
            (src.includes("property") || src.includes("photo") || src.includes("image") ||
                src.includes("img") || src.includes("listing") || alt.toLowerCase().includes("property") ||
                src.match(/\.(jpg|jpeg|png|webp)/i))) {

            let fullSrc = src;
            if (!src.startsWith("http")) {
                try {
                    fullSrc = new URL(src, url).href;
                } catch (e) {
                    fullSrc = src;
                }
            }

            if (!seenImages.has(fullSrc)) {
                seenImages.add(fullSrc);
                images.push(fullSrc);

                if (images.length >= 20) return false; // Stop after 20
            }
        }
    });

    return {
        title: title.substring(0, 200),
        price,
        location,
        bedrooms,
        bathrooms,
        area,
        description: description.substring(0, 1000),
        features: features.slice(0, 20),
        images: images.slice(0, 15),
        source: new URL(url).hostname
    };
}
