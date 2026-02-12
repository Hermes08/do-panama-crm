import { removePrivateInfo } from './netlify/functions/scrape-property';

const testCases = [
    "Contactar a Juan Perez al +507 6666-7777",
    "Email: ventas@inmobiliaria.com",
    "Visita nuestra oficina de RE/MAX",
    "Bienes Raíces Panama - 6789-1234",
    "Siguenos en @propiedadespty",
    "Para más información contactame",
    "Precio: $250,000"
];

// Mocking removePrivateInfo since it's not exported or I need to copy logic
// For this test, I'll copy the logic to ensure it works as expected here.

function mockRemovePrivateInfo(text: string): string {
    if (!text) return text;

    let cleaned = text;

    // Remove phone numbers (various formats)
    cleaned = cleaned.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g, '[PHONE]');
    cleaned = cleaned.replace(/\d{4}[-.\s]?\d{4}/g, '[PHONE_SIMPLE]');

    // Remove emails
    cleaned = cleaned.replace(/[\w.-]+@[\w.-]+\.\w+/gi, '[EMAIL]');

    // Remove contact phrases
    const contactLines = [
        /Para m[áa]s informaci[oó]n.*/gi,
        /For more information.*/gi,
        /Contact me.*/gi,
        /Cont[áa]ctame.*/gi,
        /Agenda tu cita.*/gi,
        /Schedule a visit.*/gi,
        /Interesado.*/gi,
        /Interested.*/gi,
        /Hablemos.*/gi,
        /Let's talk.*/gi
    ];

    for (const pattern of contactLines) {
        cleaned = cleaned.replace(pattern, '[CONTACT_LINE]');
    }

    // Remove common real estate company names
    const companies = [
        'RE/MAX', 'REMAX', 'Century 21', 'Engel & Völkers', 'Sotheby\'s',
        'Coldwell Banker', 'Keller Williams', 'ERA', 'Berkshire Hathaway',
        'Inmobiliaria', 'Real Estate', 'Bienes Raíces', 'Realty', 'Properties',
        'Servicios Inmobiliarios', 'Grupo Inmobiliario', 'Asesores', 'Realtor',
        'Corredor', 'Broker'
    ];

    for (const company of companies) {
        // More aggressive company removal: remove the whole line if it contains the company name
        const regex = new RegExp(`.*${company}.*`, 'gi');
        cleaned = cleaned.replace(regex, '[COMPANY_LINE]');
    }

    // Remove social media handles and links
    cleaned = cleaned.replace(/@[\w.]+/g, '[SOCIAL]');

    return cleaned;
}

console.log("--- Test Results ---");
testCases.forEach(input => {
    console.log(`Input: "${input}"`);
    console.log(`Output: "${mockRemovePrivateInfo(input)}"`);
    console.log("---");
});
