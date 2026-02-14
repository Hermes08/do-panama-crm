
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
    console.log('Setting up Supabase Storage...');

    const bucketName = 'property-images';

    // 1. Create Bucket
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
        console.error('Error listing buckets:', listError);
        return;
    }

    const bucketExists = buckets.some(b => b.name === bucketName);

    if (!bucketExists) {
        console.log(`Creating bucket: ${bucketName}...`);
        const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 5242880, // 5MB
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
        });

        if (error) {
            console.error('Error creating bucket:', error);
            return;
        }
        console.log('Bucket created successfully.');
    } else {
        console.log(`Bucket ${bucketName} already exists.`);

        // Ensure it's public
        const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
            public: true
        });
        if (updateError) console.error('Error updating bucket public status:', updateError);
    }

    // 2. Create Policy (This is usually done via SQL, but JS SDK might have limited policy management depending on version. 
    // For Storage, 'public: true' in createBucket handles the public read access for files.)

    console.log('Storage setup complete. Images uploaded to "property-images" will be publicly accessible.');
}

setupStorage();
