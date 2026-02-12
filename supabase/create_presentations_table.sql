-- Create property_presentations table
CREATE TABLE IF NOT EXISTS property_presentations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Presentation info
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  
  -- Property data (stored as JSON)
  data JSONB NOT NULL,
  
  -- Metadata
  views INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Access control
  is_public BOOLEAN DEFAULT true,
  password TEXT,
  expires_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_presentations_slug ON property_presentations(slug);
CREATE INDEX IF NOT EXISTS idx_presentations_user ON property_presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_created ON property_presentations(created_at DESC);

-- RLS Policies
ALTER TABLE property_presentations ENABLE ROW LEVEL SECURITY;

-- Public presentations can be viewed by anyone
CREATE POLICY "Public presentations are viewable by anyone"
  ON property_presentations
  FOR SELECT
  USING (is_public = true AND (expires_at IS NULL OR expires_at > NOW()));

-- Users can view their own presentations
CREATE POLICY "Users can view own presentations"
  ON property_presentations
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own presentations
CREATE POLICY "Users can insert own presentations"
  ON property_presentations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presentations
CREATE POLICY "Users can update own presentations"
  ON property_presentations
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own presentations
CREATE POLICY "Users can delete own presentations"
  ON property_presentations
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_property_presentations_updated_at
  BEFORE UPDATE ON property_presentations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_presentation_views(presentation_slug TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE property_presentations
  SET views = views + 1
  WHERE slug = presentation_slug;
END;
$$ LANGUAGE plpgsql;
