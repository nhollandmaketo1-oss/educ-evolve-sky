INSERT INTO storage.buckets (id, name, public)
VALUES ('school-assets', 'school-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read school-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

CREATE POLICY "Anyone can upload school-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-assets');

CREATE POLICY "Anyone can update school-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school-assets');

CREATE POLICY "Anyone can delete school-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'school-assets');