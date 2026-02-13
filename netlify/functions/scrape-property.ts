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

// Main Handler
export const handler: Handler = async (event: HandlerEvent) => {
    const debugLogArray: string[] = [];
    logDebug(debugLogArray, "Starting scrape request (SDK Version)");

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
    };

    if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
    if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };

    try {
        const { url } = JSON.parse(event.body || "{}");
        if (!url) throw new Error("URL is required");

        let propertyData: PropertyData = {
            title: '', price: '', location: '', description: '', features: [],
            images: [], bedrooms: '', bathrooms: '', area: '', source: 'Unknown'
        };

        const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });
        const hostname = new URL(url).hostname;

        logDebug(debugLogArray, `Identifying schema for ${hostname}`);

        try {
            let extractionResult: any;

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
            // Or we could have added images to schema, but usually Firecrawl scrape is better for HTML
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
                propertyData.title = $('h1').first().text().trim() || $('title').text().trim();
                propertyData.description = $('meta[name="description"]').attr('content') || "";

                // Try to find price
                const priceMatch = html.match(/\$[\d,]+\.?\d*/);
                if (priceMatch) propertyData.price = priceMatch[0];

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

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(propertyData),
        };

    } catch (error) {
        console.error("Handler error:", error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: "Failed to scrape property data",
                details: error instanceof Error ? error.message : "Undefined error",
                debugLog: debugLogArray,
            }),
        };
    }
    logDebug(debugLog, "Starting multi-strategy extraction");

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
    // 1. TITLE
    // Try standard selector first, then fallback to meta tags
    let title = cleanText($("h1").first().text());
    if (!title) {
        title = $('meta[property="og:title"]').attr('content') || '';
        // Clean up common suffixes
        title = title.replace('| Encuentra24.com', '').trim();
    }

    // 2. PRICE
    // Look for price in specific containers or by currency regex
    let price = cleanText($(".price, [class*='price']").first().text());
    if (!price) {
        // Fallback: finding price by text proximity
        const priceElement = $("div:contains('Precio'), span:contains('Precio')").next();
        if (priceElement.length) price = cleanText(priceElement.text());

        // Regex fallback
        if (!price) {
            const priceMatch = html.match(/\$[\d,]+(?:\.\d{2})?/);
            if (priceMatch) price = priceMatch[0];
        }
    }

    // 3. LOCATION
    let location = cleanText($(".location, [class*='address']").first().text());
    if (!location) {
        // Try breadcrumbs often found in E24
        const breadcrumbs = $(".breadcrumb, .breadcrumbs").text();
        if (breadcrumbs) location = cleanText(breadcrumbs.split('>').slice(-2).join(', '));

        // Fallback to text proximity
        if (!location) {
            const locElement = $("div:contains('Ubicación'), span:contains('Ubicación')").next();
            if (locElement.length) location = cleanText(locElement.text());
        }
    }

    // 4. DETAILS (Bedrooms, Bathrooms, Area)
    // Encuentra24 uses .info-details usually, but sometimes simple labeled lists
    let bedrooms = cleanText($(".info-details .bedrooms, .info-details:contains('Recámaras') .value").text());
    if (!bedrooms) {
        const bedMatch = html.match(/(\d+)\s*(?:Rec?maras|Recs?|Bedrooms?)/i);
        if (bedMatch) bedrooms = bedMatch[1];
    }

    let bathrooms = cleanText($(".info-details .bathrooms, .info-details:contains('Baños') .value").text());
    if (!bathrooms) {
        const bathMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:Ba?os|Baths?)/i);
        if (bathMatch) bathrooms = bathMatch[1];
    }

    let area = cleanText($(".info-details .area, .info-details:contains('m²') .value").text());
    if (!area) {
        const areaMatch = html.match(/(\d+(?:,\d+)?)\s*(?:m2|m²|mt2)/i);
        if (areaMatch) area = areaMatch[0];
    }

    // 5. DESCRIPTION
    // Expand selectors for description
    let description = cleanText($(".description-container, .description, #description, [itemprop='description']").text());
    if (!description || description.length < 50) {
        // Try getting text from generic content containers if specific classes fail
        // Often E24 puts description in a simple div under a header
        description = cleanText($("h2:contains('Detalles')").next('div, p').text());
    }

    // 6. FEATURES
    const features: string[] = [];
    $(".amenities li, .features li, ul.check-list li").each((_, el) => {
        const feature = cleanText($(el).text());
        if (feature) features.push(feature);
    });

    // 7. IMAGES
    const images: string[] = [];
    // Try all likely image containers
    $(".gallery-image, .carousel-item img, .gallery-container img, .photo").each((_, el) => {
        const src = $(el).attr("data-src") || $(el).attr("src") || $(el).attr("data-lazy-src");
        if (src && src.startsWith("http") && !src.includes("background") && !src.includes("user")) {
            images.push(src);
        }
    });

    // Fallback: Extract from script tag if images are loaded via JS (common in E24)
    if (images.length === 0) {
        const scriptContent = $("script:contains('gallery')").text();
        const imgMatches = scriptContent.match(/https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)/gi);
        if (imgMatches) {
            imgMatches.forEach(img => {
                if (!images.includes(img) && !img.includes('thumb')) images.push(img);
            });
        }
    }

    return {
        title,
        price,
        location,
        bedrooms,
        bathrooms,
        area,
        description,
        features,
        images: [...new Set(images)] // De-duplicate
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
