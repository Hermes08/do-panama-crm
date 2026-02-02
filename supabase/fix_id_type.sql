-- Change ID column to TEXT to support "CL-001" format
ALTER TABLE crm_clients ALTER COLUMN id DROP DEFAULT;
ALTER TABLE crm_clients ALTER COLUMN id TYPE TEXT;
