import { createClient } from '@supabase/supabase-js';

const url = 'https://vvvnwkdosyartgoyqqgx.supabase.co';
const key = 'sb_publishable_79wo6pd9EUEddeHF8tRHRA_vHb2FReh';
const supabase = createClient(url, key);

const main = async () => {
  const { data, error } = await supabase.from('tasks').select('id,title,photo_paths').limit(1);
  console.log('result', { data, error });
};

main().catch((err) => {
  console.error('fatal', err);
  process.exit(1);
});
