import { readFile } from 'fs/promises';
import { readdirSync } from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const MIGRATIONS_DIR = path.resolve('supabase/migrations');

if (!SUPABASE_URL) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_URL in environment.');
  process.exit(1);
}

if (!SUPABASE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

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

const migrationFiles = readdirSync(MIGRATIONS_DIR)
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.error(`No SQL migration files found in ${MIGRATIONS_DIR}`);
  process.exit(1);
}

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to Supabase DB host:', dbHost);

    for (const file of migrationFiles) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = await readFile(filePath, 'utf8');
      console.log(`Running migration: ${file}`);
      await client.query(sql);
      console.log(`✓ ${file}`);
    }

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
