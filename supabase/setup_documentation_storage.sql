-- Storage bucket for DokumentasiTab image uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentation',
  'documentation',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view documentation images" ON storage.objects;
CREATE POLICY "Public can view documentation images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documentation');

DROP POLICY IF EXISTS "Admins can upload documentation images" ON storage.objects;
CREATE POLICY "Admins can upload documentation images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documentation'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete documentation images" ON storage.objects;
CREATE POLICY "Admins can delete documentation images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documentation'
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );
