-- Better security: Only allow authenticated users to upload
-- Run this in SQL editor in Supabase

-- Create policy for authenticated uploads
CREATE POLICY "Authenticated users can upload" 
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'templates');

-- Create policy for authenticated users to read their uploads
CREATE POLICY "Authenticated users can view uploads" 
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'templates');

-- Create policy for public to view
CREATE POLICY "Public can view" 
ON storage.objects FOR SELECT
TO anon
USING (bucket_id = 'templates'); 