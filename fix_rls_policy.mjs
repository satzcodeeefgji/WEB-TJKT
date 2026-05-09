// Fix RLS Policy - Using pg package
// Run with: node fix_rls_policy.mjs

import { Client } from 'pg';

const host = 'vvvnwkdosyartgoyqqgx.db.supabase.co';
const password = 'SATRIA1209!';
const user = 'postgres';
const database = 'postgres';
const port = 5432;

const fixSQL = `
DROP POLICY IF EXISTS "Only admins can create students" ON students;
DROP POLICY IF EXISTS "Users can create students" ON students;
DROP POLICY IF EXISTS "Only admins can update students" ON students;

CREATE POLICY "Users can create students"
  ON students FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update students"
  ON students FOR UPDATE
  WITH CHECK (auth.uid() IS NOT NULL);
`;

(async () => {
  const client = new Client({
    host,
    user,
    password,
    database,
    port,
  });

  try {
    console.log('🔧 Connecting to the database...');
    await client.connect();
    console.log('✓ Connected successfully!');

    console.log('🔧 Fixing RLS policies...');
    await client.query(fixSQL);
    console.log('✓ RLS policies fixed successfully!');
  } catch (error) {
    console.error('✗ Error:', error.message);
  } finally {
    await client.end();
    console.log('🔒 Connection closed.');
  }
})();

