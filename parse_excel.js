const XLSX = require('xlsx');
const fs = require('fs');
const crypto = require('crypto');

const workbook = XLSX.readFile('CRM_Exportacion_Completa_20260202.xlsx');
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rawData = XLSX.utils.sheet_to_json(sheet);

// Map Excel columns to our TS interface
const mappedData = rawData.map(row => {
    // Helper to allow case-insensitive lookup if needed, though we use direct keys
    const get = (key) => row[key] || "";

    return {
        id: get("ID Cliente") || crypto.randomUUID(), // Use Excel ID or generate one
        full_name: get("Nombre Completo"),
        origin: get("Origen"),
        type: get("Tipo de Cliente"),
        status: get("Estado del Proceso"),
        interest_category: get("Categoría de Interés"),
        zone_project: get("Zona / Proyecto"),
        budget: get("Presupuesto") ? String(get("Presupuesto")) : "",
        closure_probability: get("Probabilidad Cierre"),
        tag: get("Etiqueta"),
        last_contact_date: get("Fecha Último Contacto") ? String(get("Fecha Último Contacto")) : "",
        next_action: get("Próxima Acción"),
        next_action_date: get("Fecha Próxima Acción") ? String(get("Fecha Próxima Acción")) : "",
        assigned_to: get("Atiende"),
        estimated_travel_date: get("Fecha Estimada Viaje"),
        detailed_notes: get("Notas Detalladas / Comentarios"),
    };
});

// Write to src/data/clients.json
fs.writeFileSync('src/data/clients.json', JSON.stringify(mappedData, null, 2));

console.log(`✅ Successfully processed ${mappedData.length} records to src/data/clients.json`);
