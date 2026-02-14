import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
    const imageUrl = event.queryStringParameters?.url;

    if (!imageUrl) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Missing 'url' query parameter" }),
        };
    }

    try {
        // Validate URL
        const parsedUrl = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid URL protocol" }),
            };
        }

        // Fetch the image server-side (no CORS restrictions here)
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; PropertyBot/1.0)',
                'Accept': 'image/*',
            },
        });

        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: `Failed to fetch image: ${response.statusText}` }),
            };
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || 'image/jpeg';

        return {
            statusCode: 200,
            headers: {
                'Content-Type': contentType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Cache-Control': 'public, max-age=86400', // Cache for 24h
            },
            body: buffer.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (err: any) {
        console.error('Proxy image error:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};

export { handler };
