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
    // MLS-specific selectors (these are examples - need to be verified)
    const title = $("h1.property-title, .listing-title").first().text().trim();
    const price = $(".price, .listing-price").first().text().trim();
    const location = $(".location, .property-location").first().text().trim();
    const bedrooms = $(".bedrooms, [class*='bed']").first().text().trim();
    const bathrooms = $(".bathrooms, [class*='bath']").first().text().trim();
    const area = $(".area, .square-feet, [class*='sqft']").first().text().trim();
    const description = $(".description, .property-description").first().text().trim();

    const features: string[] = [];
    $(".features li, .amenities li").each((_, el) => {
        const feature = $(el).text().trim();
        if (feature && !feature.toLowerCase().includes("contacto") && !feature.toLowerCase().includes("agente")) {
            features.push(feature);
        }
    });

    const images: string[] = [];
    $("img[src*='property'], .gallery img, .slider img").each((_, el) => {
        const src = $(el).attr("src");
        if (src && !src.includes("logo") && !src.includes("avatar")) {
            images.push(src.startsWith("http") ? src : new URL(src, url).href);
        }
    });

    return { title, price, location, bedrooms, bathrooms, area, description, features, images, source: "MLS ACOBIR" };
}

function scrapeEncuentra24($: ReturnType<typeof cheerio.load>, url: string): PropertyData {
    const title = $("h1[class*='title'], .ad-title").first().text().trim();
    const price = $("[class*='price']").first().text().trim();
    const location = $("[class*='location'], .breadcrumb").first().text().trim();
    const bedrooms = $("[class*='bedroom'], [data-cy='bedrooms']").first().text().trim();
    const bathrooms = $("[class*='bathroom'], [data-cy='bathrooms']").first().text().trim();
    const area = $("[class*='area'], [class*='m2']").first().text().trim();
    const description = $("[class*='description'], .ad-description").first().text().trim();

    const features: string[] = [];
    $("[class*='feature'] li, .characteristics li").each((_, el) => {
        const feature = $(el).text().trim();
        if (feature && !feature.toLowerCase().includes("contacto") && !feature.toLowerCase().includes("agente")) {
            features.push(feature);
        }
    });

    const images: string[] = [];
    $("img[class*='gallery'], img[class*='photo']").each((_, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && !src.includes("logo")) {
            images.push(src.startsWith("http") ? src : new URL(src, url).href);
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
