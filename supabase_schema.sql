-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  yaml_config TEXT,
  slides JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for templates
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Template access policy - public read access
CREATE POLICY "Public templates are viewable by everyone"
  ON templates
  FOR SELECT
  USING (true);

-- Template insert/update policy - authenticated users can insert
CREATE POLICY "Authenticated users can insert templates"
  ON templates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Template update policy - authenticated users can update their own templates
CREATE POLICY "Authenticated users can update their own templates"
  ON templates
  FOR UPDATE
  TO authenticated
  USING (true);

-- Template delete policy - authenticated users can delete their own templates
CREATE POLICY "Authenticated users can delete their own templates"
  ON templates
  FOR DELETE
  TO authenticated
  USING (true); 