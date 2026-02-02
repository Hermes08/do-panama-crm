export async function translateText(text: string, targetLang: string = 'en'): Promise<string> {
    if (!text || text.trim().length === 0) return text;

    try {
        // Using MyMemory Translation API (free, no API key required)
        const response = await fetch(
            `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|${targetLang}`
        );

        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            return data.responseData.translatedText;
        }

        // Fallback: return original text if translation fails
        return text;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

export async function translatePropertyData(data: any): Promise<any> {
    const translated = { ...data };

    // Translate key fields
    if (data.title) {
        translated.title = await translateText(data.title);
    }

    if (data.description) {
        translated.description = await translateText(data.description);
    }

    if (data.location) {
        translated.location = await translateText(data.location);
    }

    if (data.features && Array.isArray(data.features)) {
        translated.features = await Promise.all(
            data.features.map((feature: string) => translateText(feature))
        );
    }

    return translated;
}
