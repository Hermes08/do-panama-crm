
import { BackgroundHandler } from "@netlify/functions";
import FirecrawlApp from "@mendable/firecrawl-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as cheerio from "cheerio";

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// --- TIMEOUT CONSTANTS ---
const AGENT_TIMEOUT = 120000; // 2 minutes
const SCRAPE_TIMEOUT = 60000; // 1 minute

// --- SCHEMAS ---
const propertySchema = z.object({
    title: z.string().describe("The full title of the property listing"),
    price: z.string().describe("The price of the property (e.g., $500,000, €450.000)"),
    location: z.string().describe("The full address or location of the property"),
    bedrooms: z.string().optional().describe("Number of bedrooms"),
    bathrooms: z.string().optional().describe("Number of bathrooms"),
    area: z.string().optional().describe("Total area in m2 or sq ft"),
    description: z.string().describe("Full description of the property"),
    features: z.array(z.string()).describe("List of amenities and features"),
    images: z.array(z.string()).describe("List of image URLs"),
});

const Handler: BackgroundHandler = async (event) => {
    // 1. Parse Input
    if (!event.body) {
        console.error("No body provided");
        return;
    }

    let requestId: string;
    let url: string;

    try {
        const body = JSON.parse(event.body);
        requestId = body.requestId;
        url = body.url;
    } catch (e) {
        console.error("Failed to parse body", e);
        return;
    }

    if (!requestId || !url) {
        console.error("Missing requestId or url");
        return;
    }

    console.log(`[${requestId}] Starting background scrape for: ${url}`);

    // 2. Update Status to 'processing'
    await supabase
        .from("scraped_results")
        .update({ status: "processing", updated_at: new Date().toISOString() })
        .eq("id", requestId);

    const debugLogArray: string[] = [];
    const logDebug = (msg: string) => {
        const timestamp = new Date().toISOString().split("T")[1].slice(0, 8);
        const logMsg = `[${timestamp}] ${msg}`;
        console.log(logMsg);
        debugLogArray.push(logMsg);
    };

    logDebug(`Starting background scrape for ${url}`);

    try {
        const apiKey = process.env.FIRECRAWL_API_KEY;
        if (!apiKey) throw new Error("Firecrawl API key missing");

        const app = new FirecrawlApp({ apiKey });

        logDebug("Launching parallel requests: Agent + HTML Scrape");

        // A. HTML Scrape Promise
        const scrapePromise = app.scrape(url, {
            formats: ["html"],
            timeout: SCRAPE_TIMEOUT,
        }).then(result => ({ type: 'scrape', result })).catch(err => ({ type: 'scrape', error: err }));

        // B. Agent Extraction Promise
        const jsonSchema = zodToJsonSchema(propertySchema, "propertySchema");
        const agentPromise = app.extract({
            urls: [url],
            schema: jsonSchema,
            prompt: "Extract detailed property information from this real estate listing.",
        }).then(result => ({ type: 'agent', result })).catch(err => ({ type: 'agent', error: err }));

        // Wait for HTML Scrape first
        const scrapeOutcome = await scrapePromise;
        let htmlContent: string | undefined;

        if ('error' in scrapeOutcome && scrapeOutcome.error) {
            logDebug(`HTML Scrape failed: ${scrapeOutcome.error}`);
        } else if ('result' in scrapeOutcome && scrapeOutcome.result && (scrapeOutcome.result as any).success) {
            // @ts-ignore
            htmlContent = scrapeOutcome.result.html || scrapeOutcome.result.data?.html;
            logDebug("HTML Scrape successful. Content length: " + (htmlContent?.length || 0));
        }

        // Wait for Agent
        const agentOutcome = await Promise.race([
            agentPromise,
            new Promise<{ type: 'agent', error: any }>(resolve =>
                setTimeout(() => resolve({ type: 'agent', error: 'Agent Soft Timeout' }), AGENT_TIMEOUT + 5000)
            )
        ]);

        let finalData: any = {
            source: "Firecrawl Background",
            images: [],
            features: [],
            debugLog: debugLogArray
        };

        // --- PROCESS RESULTS ---

        if (!('error' in agentOutcome) && 'result' in agentOutcome && agentOutcome.result && (agentOutcome.result as any).success) {
            // SUCCESS
            // @ts-ignore
            const extracted = agentOutcome.result.data as any;
            logDebug("Agent extraction successful!");
            finalData = { ...finalData, ...extracted };
        } else {
            // FAILURE
            const errorMsg = 'error' in agentOutcome ? agentOutcome.error : 'Unknown error';
            logDebug(`Agent failed: ${errorMsg}. Falling back to HTML extraction.`);

            if (htmlContent) {
                const fallbackData = extractWithCheerio(htmlContent, url);
                finalData = { ...finalData, ...fallbackData };
                finalData.source = "Firecrawl HTML Fallback";
            } else {
                throw new Error("Both Agent and HTML Scrape failed.");
            }
        }

        // --- IMAGE EXTRACTION ---
        if (htmlContent) {
            const images = extractImagesFromHtml(htmlContent, url);
            if (images.length > 0) {
                const existingImages = new Set(finalData.images || []);
                images.forEach(img => existingImages.add(img));
                finalData.images = Array.from(existingImages);
                logDebug(`Enhanced image count to ${finalData.images.length}`);
            }
        }

        // --- IMAGE PROXY / STORAGE (Fix CORS) ---
        logDebug("Proxying images to Supabase Storage...");
        const uniqueImages = Array.from(new Set(finalData.images || []));
        const proxiedImages: string[] = [];

        for (const imgUrl of uniqueImages) {
            try {
                // 1. Download Image
                const response = await fetch(imgUrl as string);
                if (!response.ok) {
                    console.warn(`Failed to fetch image: ${imgUrl}`);
                    continue;
                }
                const arrayBuffer = await response.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // 2. Generate Filename
                let ext = 'jpg';
                const contentType = response.headers.get('content-type');
                if (contentType === 'image/png') ext = 'png';
                else if (contentType === 'image/webp') ext = 'webp';
                else if (contentType === 'image/jpeg') ext = 'jpg';

                const filename = `${requestId}/${crypto.randomUUID()}.${ext}`;

                // 3. Upload to Supabase
                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filename, buffer, {
                        contentType: contentType || 'image/jpeg',
                        upsert: false
                    });

                if (uploadError) {
                    console.error(`Failed to upload image ${imgUrl}:`, uploadError);
                    proxiedImages.push(imgUrl as string);
                } else {
                    // 4. Get Public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('property-images')
                        .getPublicUrl(filename);

                    proxiedImages.push(publicUrl);
                }

            } catch (err) {
                console.error(`Error proxying image ${imgUrl}:`, err);
                proxiedImages.push(imgUrl as string);
            }
        }

        finalData.images = proxiedImages;
        logDebug(`Proxied ${proxiedImages.length} images.`);

        // --- SAVE TO SUPABASE ---
        logDebug("Saving results to Supabase...");
        const { error: saveError } = await supabase
            .from("scraped_results")
            .update({
                status: "completed",
                data: finalData,
                updated_at: new Date().toISOString()
            })
            .eq("id", requestId);

        if (saveError) {
            console.error("Failed to save result to Supabase", saveError);
        } else {
            logDebug("Successfully saved data.");
        }

    } catch (err: any) {
        console.error("Background Scrape Failed", err);
        logDebug(`CRITICAL FAILURE: ${err.message}`);

        await supabase
            .from("scraped_results")
            .update({
                status: "failed",
                error: err.message,
                data: { debugLog: debugLogArray },
                updated_at: new Date().toISOString()
            })
            .eq("id", requestId);
    }
};

// --- HELPER FUNCTIONS ---

function extractImagesFromHtml(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const images = new Set<string>();

    $('img').each((_, el) => {
        let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
        if (src) {
            if (src.includes('logo') || src.includes('icon') || src.includes('profile')) return;
            try {
                if (!src.startsWith('http')) {
                    src = new URL(src, baseUrl).toString();
                }
                images.add(src);
            } catch (e) { }
        }
    });

    $('meta[property="og:image"]').each((_, el) => {
        const content = $(el).attr('content');
        if (content) images.add(content);
    });

    return Array.from(images);
}

function extractWithCheerio(html: string, url: string) {
    const $ = cheerio.load(html);

    const title = $('h1').first().text().trim() || $('title').text().trim();
    const description = $('meta[name="description"]').attr('content') ||
        $('div[class*="description"]').text().trim() ||
        $('p').slice(0, 3).text().trim();

    let price = '';
    const priceRegex = /[\$€£]\s*[0-9,.]+/;
    const bodyText = $('body').text();
    const priceMatch = bodyText.match(priceRegex);
    if (priceMatch) price = priceMatch[0];

    return {
        title,
        description,
        price,
        location: "",
        features: []
    };
}

export { Handler as handler };
