
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or key in .env.local');
    process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon');

const supabase = createClient(supabaseUrl, supabaseKey);

async function setup() {
    // 1. Create Storage Bucket
    console.log('\n--- Creating Storage Bucket ---');
    try {
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();

        if (listError) {
            console.error('Cannot list buckets (may need service_role key):', listError.message);
            console.log('Trying to create bucket directly...');

            const { error: createError } = await supabase.storage.createBucket('property-images', {
                public: true,
                fileSizeLimit: 10485760, // 10MB
            });

            if (createError) {
                console.error('Failed to create bucket:', createError.message);
                console.log('\n⚠️  You need to create the "property-images" bucket manually in Supabase Dashboard:');
                console.log('   1. Go to Storage in Supabase Dashboard');
                console.log('   2. Click "New bucket"');
                console.log('   3. Name: property-images');
                console.log('   4. Check "Public bucket"');
                console.log('   5. Click "Create bucket"');
            } else {
                console.log('✅ Bucket "property-images" created!');
            }
        } else {
            const exists = buckets.some(b => b.name === 'property-images');
            if (exists) {
                console.log('✅ Bucket "property-images" already exists.');
            } else {
                const { error: createError } = await supabase.storage.createBucket('property-images', {
                    public: true,
                    fileSizeLimit: 10485760,
                });
                if (createError) {
                    console.error('Failed to create bucket:', createError.message);
                } else {
                    console.log('✅ Bucket "property-images" created!');
                }
            }
        }
    } catch (e) {
        console.error('Storage setup error:', e.message);
    }

    // 2. Create property_presentations table via SQL
    console.log('\n--- Creating property_presentations table ---');
    try {
        const { error: rpcError } = await supabase.rpc('exec_sql', {
            sql: `
        CREATE TABLE IF NOT EXISTS property_presentations (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          property_data JSONB NOT NULL DEFAULT '{}',
          images TEXT[] DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE property_presentations ENABLE ROW LEVEL SECURITY;

        CREATE POLICY IF NOT EXISTS "Allow public read" ON property_presentations
          FOR SELECT USING (true);

        CREATE POLICY IF NOT EXISTS "Allow public insert" ON property_presentations
          FOR INSERT WITH CHECK (true);

        CREATE POLICY IF NOT EXISTS "Allow public update" ON property_presentations
          FOR UPDATE USING (true);
      `
        });

        if (rpcError) {
            console.error('RPC exec_sql failed (expected if no exec_sql function):', rpcError.message);
            console.log('\n⚠️  You need to create the "property_presentations" table manually in Supabase SQL Editor:');
            console.log(`
CREATE TABLE IF NOT EXISTS property_presentations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  property_data JSONB NOT NULL DEFAULT '{}',
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE property_presentations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON property_presentations FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON property_presentations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON property_presentations FOR UPDATE USING (true);
      `);
        } else {
            console.log('✅ Table "property_presentations" created!');
        }
    } catch (e) {
        console.error('Table creation error:', e.message);
    }

    console.log('\nSetup complete. Please verify in Supabase Dashboard.');
}

setup().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
