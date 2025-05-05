-- Add additional_images column to templates table
-- Run this in Supabase SQL Editor

-- First check if column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'templates' 
        AND column_name = 'additional_images'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE public.templates 
        ADD COLUMN additional_images JSONB DEFAULT '[]'::jsonb;
        
        -- Add comment
        COMMENT ON COLUMN public.templates.additional_images IS 'Array of additional image URLs for the template';
    END IF;
END
$$; 