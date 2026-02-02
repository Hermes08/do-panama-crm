require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase URL or Key in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const clientsPath = path.join(__dirname, '../src/data/clients.json');
const clientsData = JSON.parse(fs.readFileSync(clientsPath, 'utf8'));

async function seed() {
    console.log(`🚀 Starting seed of ${clientsData.length} clients...`);

    // Transform data to match snake_case columns if needed, but our JSON keys match mostly.
    // We need to ensure we don't duplicate if they already exist.
    // Since we don't have a unique constraint on full_name, we might just INSERT.
    // But let's check count first.

    const { count } = await supabase.from('crm_clients').select('*', { count: 'exact', head: true });

    if (count > 0) {
        console.log(`⚠️ Table 'crm_clients' already has ${count} rows. Skipping seed to prevent duplicates.`);
        return;
    }

    // Insert in batches
    const { error } = await supabase.from('crm_clients').insert(clientsData);

    if (error) {
        console.error("❌ Error seeding data:", error);
    } else {
        console.log("✅ Successfully seeded initial data to Supabase!");
    }
}

seed();
