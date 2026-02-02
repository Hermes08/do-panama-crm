import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from '../types';

// Load env vars
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Path to clients.json (assuming it's in the artifacts folder, but we copy it locally for the script or read absolute)
// For this script, we'll embed the data path or require it. 
// Since we are running this in the project context, I'll assume we duplicate clients.json to the project root or read from absolute.
// For simplicity, I will copy the clients.json content to a local file.

const clientsJsonPath = path.join(process.cwd(), 'clients.json');

async function seed() {
    if (!fs.existsSync(clientsJsonPath)) {
        console.error(`clients.json not found at ${clientsJsonPath}`);
        return;
    }

    const rawData = fs.readFileSync(clientsJsonPath, 'utf8');
    const clientsData = JSON.parse(rawData);

    console.log(`Found ${clientsData.length} clients to seed.`);

    for (const c of clientsData) {
        const client: Partial<Client> = {
            legacy_id: c["ID Cliente"],
            full_name: c["Nombre Completo"],
            origin: c["Origen"],
            type: c["Tipo de Cliente"],
            status: c["Estado del Proceso"],
            interest_category: c["Categoría de Interés"],
            zone_project: c["Zona / Proyecto"],
            budget: c["Presupuesto"]?.toString(),
            closure_probability: c["Probabilidad Cierre"],
            tag: c["Etiqueta"],
            last_contact_date: c["Fecha Último Contacto"],
            next_action: c["Próxima Acción"],
            next_action_date: c["Fecha Próxima Acción"],
            assigned_to: c["Atiende"],
            estimated_travel_date: c["Fecha Estimada Viaje"],
            internal_notes: c["Comentarios / Notas Internas"],
            detailed_notes: c["Notas Detalladas"]
        };

        const { error } = await supabase.from('clients').insert(client);

        if (error) {
            console.error(`Error inserting ${client.full_name}:`, error.message);
        } else {
            console.log(`Inserted ${client.full_name}`);
        }
    }

    console.log("Seeding complete.");
}

seed();
