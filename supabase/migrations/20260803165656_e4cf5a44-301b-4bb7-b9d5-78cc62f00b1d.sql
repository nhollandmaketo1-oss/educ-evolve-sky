DROP POLICY IF EXISTS "app_buckets_all" ON storage.objects;
CREATE POLICY "app_buckets_all" ON storage.objects FOR ALL TO anon, authenticated
USING (bucket_id IN ('school-assets','message-attachments','staff-documents'))
WITH CHECK (bucket_id IN ('school-assets','message-attachments','staff-documents'));