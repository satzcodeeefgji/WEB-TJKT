import { Client } from 'pg';

const SUPABASE_URL = "https://vvvnwkdosyartgoyqqgx.supabase.co";
const SUPABASE_KEY = "SATRIA1209!";

const projectHost = new URL(SUPABASE_URL).hostname;
const dbHost = projectHost.replace('.supabase.co', '.db.supabase.co');

const client = new Client({
  host: dbHost,
  user: 'postgres',
  database: 'postgres',
  password: SUPABASE_KEY,
  port: 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

const migrationSQL = `
-- Add is_active column to libur_records table
ALTER TABLE libur_records ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

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
`;

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to Supabase DB host:', dbHost);

    await client.query(migrationSQL);
    console.log('✓ Migration completed successfully!');
    console.log('✓ Added is_active column to libur_records table');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();