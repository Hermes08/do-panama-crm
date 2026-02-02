-- Add missing columns to match JSON data
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS closure_probability TEXT;
ALTER TABLE crm_clients ADD COLUMN IF NOT EXISTS internal_notes TEXT;
-- Ensure ID is UUID if not already (it was defined as UUID DEFAULT gen_random_uuid())
