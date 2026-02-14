-- Create a table to store async scraping results
-- This is needed because Netlify Background Functions cannot return values to the client
CREATE TABLE IF NOT EXISTS scraped_results (
    id UUID PRIMARY KEY, -- We'll generate this on client or server
    url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    data JSONB, -- The full scraped data
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE scraped_results ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public READ (clients polling for their ID)
CREATE POLICY "Enable public read access" ON scraped_results FOR SELECT USING (true);

-- Create policy to allow public INSERT/UPDATE (functions writing results)
-- In a real app, this should be service_role only, but for now we follow the project's pattern
CREATE POLICY "Enable public write access" ON scraped_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable public update access" ON scraped_results FOR UPDATE USING (true);
