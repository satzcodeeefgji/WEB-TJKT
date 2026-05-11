-- Add is_active column to libur_records table
ALTER TABLE libur_records ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Update existing records to be active
UPDATE libur_records SET is_active = true WHERE is_active IS NULL;

-- Update RLS policies to allow admin updates
DROP POLICY IF EXISTS "Allow admin to update libur_records" ON libur_records;
CREATE POLICY "Allow admin to update libur_records" ON libur_records
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);