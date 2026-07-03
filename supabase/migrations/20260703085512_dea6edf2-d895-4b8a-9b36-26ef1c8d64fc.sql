
DROP POLICY IF EXISTS "staff_documents_all" ON storage.objects;
CREATE POLICY "staff_documents_all" ON storage.objects
  FOR ALL USING (bucket_id = 'staff-documents') WITH CHECK (bucket_id = 'staff-documents');
