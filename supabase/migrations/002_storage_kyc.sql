-- ============================================================
-- MaidEzy — Storage bucket for KYC documents
-- Run after 001_initial_schema.sql
-- ============================================================

-- Create the bucket (idempotent)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-docs', 'kyc-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own files
-- Files are stored at: <user_id>/<filename>
DROP POLICY IF EXISTS "Authenticated users can upload KYC docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload KYC docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kyc-docs');

DROP POLICY IF EXISTS "Authenticated users can update their KYC docs" ON storage.objects;
CREATE POLICY "Authenticated users can update their KYC docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kyc-docs');

DROP POLICY IF EXISTS "Anyone can view KYC docs" ON storage.objects;
CREATE POLICY "Anyone can view KYC docs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'kyc-docs');

DROP POLICY IF EXISTS "Authenticated users can delete their KYC docs" ON storage.objects;
CREATE POLICY "Authenticated users can delete their KYC docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'kyc-docs');
