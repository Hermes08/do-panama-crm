-- Create a specific table for CRM clients to avoid conflicts with existing data
CREATE TABLE IF NOT EXISTS crm_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    origin TEXT,
    status TEXT, -- 'Cliente activo', 'Prospecto', etc.
    interest_category TEXT, -- 'Compra', 'Alquiler'
    zone_project TEXT,
    budget TEXT,
    tag TEXT, -- 'Hot', 'Sospechoso', etc.
    last_contact_date TEXT,
    next_action TEXT,
    next_action_date TEXT,
    assigned_to TEXT,
    estimated_travel_date TEXT,
    detailed_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE crm_clients ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read/write for now (since we don't have auth setup yet)
-- In production, this should be restricted to authenticated users
CREATE POLICY "Enable all access for now" ON crm_clients FOR ALL USING (true) WITH CHECK (true);
