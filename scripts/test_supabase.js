const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("Testing connection...");
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    try {
        const { count, error } = await supabase.from('crm_clients').select('*', { count: 'exact', head: true });
        if (error) {
            console.error("Error:", error);
        } else {
            console.log("Success! Count:", count);
        }
    } catch (e) {
        console.error("Exception:", e);
    }
}

test();
