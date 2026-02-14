import { BackgroundHandler } from "@netlify/functions";
import FirecrawlApp from "@mendable/firecrawl-js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import * as cheerio from "cheerio";

// Initialize Supabase (Service Role needed for writing if RLS is strict, but we used Anon key approach in client. 
// However, in a function, we should use the service role key if possible, or fall back to anon key + public write policy)
// For now, using process.env access standard in Netlify
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
}

const supabase = createClient(supabaseUrl!, supabaseKey!);

// --- TIMEOUT CONSTANTS ---
// Netlify Background Functions can run up to 15 minutes.
// We'll set a reasonable hard limit for the Agent to avoid wasting resources.
const AGENT_TIMEOUT = 120000; // 2 minutes for the agent to think/extract
const SCRAPE_TIMEOUT = 60000; // 1 minute for the raw HTML scrape

// --- SCHEMAS (Reused from scrape-property.ts) ---
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

        // --- EXECUTION STRATEGY (Same as robust sync function) ---
        // 1. Start HTML Scrape (Fast, Essential for images & fallback)
        // 2. Start AI Agent (Slow, Smart)
        // 3. Wait for HTML first to ensure we have it.
        // 4. Wait for Agent with timeout.

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

        // Wait for HTML Scrape first (it's usually faster and we NEED it for images)
        const scrapeOutcome = await scrapePromise;
        let htmlContent: string | undefined;

        if ('error' in scrapeOutcome && scrapeOutcome.error) { // Type guard
            logDebug(`HTML Scrape failed: ${scrapeOutcome.error}`);
        } else if ('result' in scrapeOutcome && scrapeOutcome.result && (scrapeOutcome.result as any).success) {
            // @ts-ignore
            htmlContent = scrapeOutcome.result.html || scrapeOutcome.result.data?.html; // Handle different SDK versions
            logDebug("HTML Scrape successful. Content length: " + (htmlContent?.length || 0));
        }

        // Now wait for Agent, but enforce our own timeout if the SDK doesn't
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
            // SUCCESS: Agent worked
            // @ts-ignore
            const extracted = agentOutcome.result.data as any;
            logDebug("Agent extraction successful!");
            finalData = { ...finalData, ...extracted };
        } else {
            // FAILURE: Agent failed/timed out
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

        // --- IMAGE EXTRACTION (Always try to improve images using HTML) ---
        if (htmlContent) {
            const images = extractImagesFromHtml(htmlContent, url);
            if (images.length > 0) {
                // Merge images, preferring high-res ones found via cheerio
                // If agent found nothing, use ours. If agent found some, prioritize ours if they look better?
                // Simple strategy: If agent has < 5 images, append ours unique ones.
                const existingImages = new Set(finalData.images || []);
                images.forEach(img => existingImages.add(img));
                finalData.images = Array.from(existingImages);
                logDebug(`Enhanced image count to ${finalData.images.length}`);
            }
        }

        // --- IMAGE PROXY / STORAGE (Fix CORS) ---
        // Iterate through unique images, download them, upload to Supabase 'property-images' bucket
        // and replace the URL in finalData.images with the public Supabase URL.
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

                // 2. Generate Filename (hash or random)
                // Extract extension or default to .jpg
                let ext = 'jpg';
                const contentType = response.headers.get('content-type');
                if (contentType === 'image/png') ext = 'png';
                else if (contentType === 'image/webp') ext = 'webp';
                else if (contentType === 'image/jpeg') ext = 'jpg';

                const filename = `${requestId}/${crypto.randomUUID()}.${ext}`;

                // 3. Upload to Supabase
                // Ensure bucket exists (best effort)
                // Note: creating bucket here might fail if we don't have permissions, but we'll try.
                // Actually, checking existence every time is slow. Let's just try upload.
                // If it fails with 'Bucket not found', we could try to create it, but that's complex.
                // We'll rely on the setup script having worked or being run manually if needed.
                // But since the script hung, let's try to ensure public access is set if we can.

                const { error: uploadError } = await supabase.storage
                    .from('property-images')
                    .upload(filename, buffer, {
                        contentType: contentType || 'image/jpeg',
                        upsert: false
                    });

                if (uploadError) {
                    console.error(`Failed to upload image ${imgUrl}:`, uploadError);
                    // Fallback to original URL if upload fails? Or skip?
                    // Let's keep original for now as fallback, but users might see broken images if CORS blocks.
                    // Actually, if CORS blocks, original is useless for PDF.
                    // We'll push original, but it won't fix PDF issue.
                    proxiedImages.push(imgUrl as string);
                    const images = new Set<string>();

                    // Common gallery selectors
                    $('img').each((_, el) => {
                        let src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy-src');
                        if (src) {
                            // Filter out small icons/logos
                            if (src.includes('logo') || src.includes('icon') || src.includes('profile')) return;
                            // Resolve relative URLs
                            try {
                                if (!src.startsWith('http')) {
                                    src = new URL(src, baseUrl).toString();
                                }
                                images.add(src);
                            } catch (e) { }
                        }
                    });

                    // Special handling for meta tags (og:image) - often high quality
                    $('meta[property="og:image"]').each((_, el) => {
                        const content = $(el).attr('content');
                        if (content) images.add(content);
                    });

                    return Array.from(images);
                }

                function extractWithCheerio(html: string, url: string) {
                    const $ = cheerio.load(html);

                    // Basic heuristics for fallback
                    const title = $('h1').first().text().trim() || $('title').text().trim();
                    const description = $('meta[name="description"]').attr('content') ||
                        $('div[class*="description"]').text().trim() ||
                        $('p').slice(0, 3).text().trim(); // First few paragraphs

                    let price = '';
                    // Try to find price-like patterns
                    const priceRegex = /[\$€£]\s*[0-9,.]+/;
                    const bodyText = $('body').text();
                    const priceMatch = bodyText.match(priceRegex);
                    if (priceMatch) price = priceMatch[0];

                    return {
                        title,
                        description,
                        price,
                        location: "", // Hard to guess
                        features: []
                    };
                }

                export { Handler as handler };
