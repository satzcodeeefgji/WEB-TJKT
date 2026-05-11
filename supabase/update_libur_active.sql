-- Add is_active column to libur_records to track active libur periods
ALTER TABLE libur_records ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE libur_records SET is_active = true WHERE is_active IS NULL;

-- Update RLS policies to allow admins to update libur_records
DROP POLICY IF EXISTS "Only admins can update libur_records" ON libur_records;
CREATE POLICY "Only admins can update libur_records"
  ON libur_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );