// Test script to check libur delete functionality
import { supabase } from './src/integrations/supabase/client.js';

async function testLiburDelete() {
  console.log('Testing libur delete functionality...');

  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current user:', user?.id);

  if (!user) {
    console.log('No user logged in');
    return;
  }

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  console.log('User role:', profile?.role);

  // Try to delete a libur record (if exists)
  const { data: liburRecords } = await supabase
    .from('libur_records')
    .select('*')
    .limit(1);

  console.log('Libur records found:', liburRecords?.length || 0);

  if (liburRecords && liburRecords.length > 0) {
    const record = liburRecords[0];
    console.log('Attempting to delete libur record:', record.id);

    const { error } = await supabase
      .from('libur_records')
      .delete()
      .eq('id', record.id);

    if (error) {
      console.error('Delete error:', error);
    } else {
      console.log('Delete successful');
    }
  } else {
    console.log('No libur records to delete');
  }
}

testLiburDelete().catch(console.error);