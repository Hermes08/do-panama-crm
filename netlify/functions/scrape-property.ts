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
    // CORS headers
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

        // Fetch the HTML
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);

        let propertyData: PropertyData = {
            title: "",
            price: "",
            location: "",
            description: "",
            features: [],
            images: [],
            source: new URL(url).hostname,
        };

        // Scrape based on source
        if (url.includes("mlsacobir.com")) {
            propertyData = scrapeMLS($, url);
        } else if (url.includes("encuentra24.com")) {
            propertyData = scrapeEncuentra24($, url);
        } else if (url.includes("jamesedition.com")) {
            propertyData = scrapeJamesEdition($, url);
        } else {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: "Unsupported property source" }),
            };
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

function scrapeMLS($: ReturnType<typeof cheerio.load>, url: string): PropertyData {
    // Try multiple selectors for better data extraction
    const title = $("h1, .property-title, .listing-title, [class*='title']").first().text().trim() || "Property Listing";

    const price = $(".price, .listing-price, [class*='price'], [class*='Price']").first().text().trim() ||
        $("span:contains('$'), div:contains('$')").first().text().trim() || "Price on Request";

    const location = $(".location, .property-location, [class*='location'], .address, [class*='address']").first().text().trim() ||
        $("span:contains('Panama'), div:contains('Panama')").first().text().trim() || "Panama";

    // Extract bedrooms with multiple patterns
    let bedrooms = $(".bedrooms, [class*='bed'], [class*='Bed']").first().text().trim();
    if (!bedrooms) {
        const bedroomMatch = $.html().match(/(\d+)\s*(bed|bedroom|habitaci)/i);
        bedrooms = bedroomMatch ? bedroomMatch[1] + " beds" : "";
    }

    // Extract bathrooms
    let bathrooms = $(".bathrooms, [class*='bath'], [class*='Bath']").first().text().trim();
    if (!bathrooms) {
        const bathroomMatch = $.html().match(/(\d+\.?\d*)\s*(bath|baño)/i);
        bathrooms = bathroomMatch ? bathroomMatch[1] + " baths" : "";
    }

    // Extract area
    let area = $(".area, .square-feet, [class*='sqft'], [class*='m2'], [class*='area']").first().text().trim();
    if (!area) {
        const areaMatch = $.html().match(/(\d+[,\d]*)\s*(m2|sqft|sq ft)/i);
        area = areaMatch ? areaMatch[0] : "";
    }

    // Description - try multiple selectors
    const description = $(".description, .property-description, [class*='description'], p").filter((_, el) => {
        const text = $(el).text();
        return text.length > 100; // Get longest paragraph
    }).first().text().trim() || "Luxury property in Panama";

    const features: string[] = [];
    $(".features li, .amenities li, ul li, [class*='feature'] li").each((_, el) => {
        const feature = $(el).text().trim();
        if (feature && feature.length > 3 && feature.length < 100 &&
            !feature.toLowerCase().includes("contacto") &&
            !feature.toLowerCase().includes("agente") &&
            !feature.toLowerCase().includes("whatsapp")) {
            features.push(feature);
        }
    });

    const images: string[] = [];
    $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy");
        if (src && !src.includes("logo") && !src.includes("avatar") && !src.includes("icon") &&
            (src.includes("property") || src.includes("photo") || src.includes("image") || src.includes("img"))) {
            const fullSrc = src.startsWith("http") ? src : new URL(src, url).href;
            if (!images.includes(fullSrc)) {
                images.push(fullSrc);
            }
        }
    });

    return { title, price, location, bedrooms, bathrooms, area, description, features, images, source: "MLS ACOBIR" };
}

function scrapeEncuentra24($: ReturnType<typeof cheerio.load>, url: string): PropertyData {
    const title = $("h1, [class*='title'], .ad-title").first().text().trim() || "Property for Sale";
    const price = $("[class*='price'], [class*='Price']").first().text().trim() || "Contact for Price";
    const location = $("[class*='location'], .breadcrumb, [class*='address']").first().text().trim() || "Panama";

    let bedrooms = $("[class*='bedroom'], [data-cy='bedrooms'], [class*='Bed']").first().text().trim();
    if (!bedrooms) {
        const match = $.html().match(/(\d+)\s*(hab|bed|rec)/i);
        bedrooms = match ? match[1] + " beds" : "";
    }

    let bathrooms = $("[class*='bathroom'], [data-cy='bathrooms'], [class*='Bath']").first().text().trim();
    if (!bathrooms) {
        const match = $.html().match(/(\d+\.?\d*)\s*(baño|bath)/i);
        bathrooms = match ? match[1] + " baths" : "";
    }

    let area = $("[class*='area'], [class*='m2'], [class*='superficie']").first().text().trim();
    if (!area) {
        const match = $.html().match(/(\d+[,\d]*)\s*m2/i);
        area = match ? match[0] : "";
    }

    const description = $("[class*='description'], .ad-description, [class*='desc'], p").filter((_, el) => {
        return $(el).text().length > 100;
    }).first().text().trim() || "Beautiful property in Panama";

    const features: string[] = [];
    $("[class*='feature'] li, .characteristics li, ul li").each((_, el) => {
        const feature = $(el).text().trim();
        if (feature && feature.length > 3 && feature.length < 100 &&
            !feature.toLowerCase().includes("contacto") &&
            !feature.toLowerCase().includes("agente") &&
            !feature.toLowerCase().includes("whatsapp")) {
            features.push(feature);
        }
    });

    const images: string[] = [];
    $("img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy");
        if (src && !src.includes("logo") && !src.includes("icon") &&
            (src.includes("photo") || src.includes("image") || src.includes("img") || src.includes("property"))) {
            const fullSrc = src.startsWith("http") ? src : new URL(src, url).href;
            if (!images.includes(fullSrc)) {
                images.push(fullSrc);
            }
        }
    });

    return { title, price, location, bedrooms, bathrooms, area, description, features, images, source: "Encuentra24" };
}

function scrapeJamesEdition($: ReturnType<typeof cheerio.load>, url: string): PropertyData {
    const title = $("h1.listing-title, h1[class*='title']").first().text().trim();
    const price = $(".price, [class*='price']").first().text().trim();
    const location = $(".location, [class*='location']").first().text().trim();
    const bedrooms = $("[class*='bedroom']").first().text().trim();
    const bathrooms = $("[class*='bathroom']").first().text().trim();
    const area = $("[class*='area'], [class*='size']").first().text().trim();
    const description = $(".description, [class*='description']").first().text().trim();

    const features: string[] = [];
    $(".features li, .amenities li").each((_, el) => {
        const feature = $(el).text().trim();
        if (feature) {
            features.push(feature);
        }
    });

    const images: string[] = [];
    $("img[class*='listing'], .gallery img").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && !src.includes("logo")) {
            images.push(src.startsWith("http") ? src : new URL(src, url).href);
        }
    });

    return { title, price, location, bedrooms, bathrooms, area, description, features, images, source: "James Edition" };
}
