-- Create carousel_ad_assets table for storing generated creative text
CREATE TABLE IF NOT EXISTS public.carousel_ad_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hook', 'headline', 'script')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Set up row level security
ALTER TABLE public.carousel_ad_assets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow access to auth users
CREATE POLICY "Allow authenticated users to read ad assets" 
  ON public.carousel_ad_assets 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Create policy to allow users to insert their own assets
CREATE POLICY "Allow authenticated users to create ad assets" 
  ON public.carousel_ad_assets 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Update function trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_carousel_ad_assets_updated_at
BEFORE UPDATE ON public.carousel_ad_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column(); 