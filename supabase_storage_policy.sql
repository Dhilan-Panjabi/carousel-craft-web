-- Grant public access to templates bucket
-- Run this in SQL editor in Supabase

-- Allow public uploads to templates bucket
INSERT INTO storage.policies (name, definition, bucket_id)
VALUES (
  'Public Upload Templates',
  '(bucket_id = ''templates''::text)',
  'templates'
);

-- Allow public reading of objects in templates bucket
INSERT INTO storage.policies (name, definition, bucket_id)
VALUES (
  'Public Read Templates',
  '(bucket_id = ''templates''::text)',
  'templates'
);

-- Alternative approach using storage.update_bucket
-- This is a simpler way to set public access
SELECT storage.update_bucket('templates', ARRAY['READ'], ARRAY['READ']); 