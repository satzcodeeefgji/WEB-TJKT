import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  db: {
    schema: 'public',
  },
});

const migrationSql = `
-- Update handle_new_user to assign first 3 users as admins
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if (select count(*) from public.user_roles where role = 'admin') < 3 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end;
$$;
`;

async function runMigration() {
  try {
    console.log('Running migration...');
    
    // Execute SQL directly
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSql
    });
    
    if (error) {
      console.error('Error via RPC:', error);
      // Try alternative approach
      console.log('Trying alternative method...');
      return;
    }
    
    console.log('Migration executed successfully!', data);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

runMigration();
