-- Enable Row Level Security
ALTER TABLE IF EXISTS clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS client_versions ENABLE ROW LEVEL SECURITY;

-- 1. Clients Table
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id TEXT,
    full_name TEXT NOT NULL,
    origin TEXT,
    type TEXT,
    status TEXT,
    interest_category TEXT,
    zone_project TEXT,
    budget TEXT, -- Keeping as text for now due to formatting, can be parsed later
    closure_probability TEXT,
    tag TEXT,
    last_contact_date TEXT,
    next_action TEXT,
    next_action_date TEXT,
    assigned_to TEXT,
    estimated_travel_date TEXT,
    internal_notes TEXT,
    detailed_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Client Versions Table (History)
CREATE TABLE client_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES auth.users(id),
    change_type TEXT DEFAULT 'manual', -- 'manual' or 'ai_edit'
    change_summary TEXT, 
    snapshot_data JSONB, -- Full copy of the client record at this time
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Profiles (for Admin Role)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    role TEXT DEFAULT 'admin'
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'admin'); -- Defaulting everyone to admin for this simplified CRM
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- POLICIES

-- Allow authenticated users to read/write all clients (Simplified for this use case)
CREATE POLICY "Allow authenticated full access to clients"
ON clients
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to read/write versions
CREATE POLICY "Allow authenticated full access to client_versions"
ON client_versions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow users to read their own profile
CREATE POLICY "Allow individuals to read own profile"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
