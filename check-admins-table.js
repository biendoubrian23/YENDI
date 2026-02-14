const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjvveodsmudowfhhvkff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnZlb2RzbXVkb3dmaGh2a2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjUwMDgsImV4cCI6MjA4NjMwMTAwOH0.kSKcK-w9pWJzGFtyybxNmBElH3PtE7J7HvGuaZSNChM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdmins() {
  console.log('🔍 Vérification de la table agency_admins...\n');
  
  const { data: admins, error } = await supabase
    .from('agency_admins')
    .select('*, agencies(name), profiles(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  console.log(`✅ ${admins?.length || 0} admin(s) trouvé(s):\n`);
  
  if (admins && admins.length > 0) {
    admins.forEach((admin, i) => {
      console.log(`${i + 1}. Agence: ${admin.agencies?.name || 'N/A'}`);
      console.log(`   Admin: ${admin.profiles?.full_name || 'N/A'} (${admin.profiles?.email || 'N/A'})`);
      console.log(`   Rôle: ${admin.role} | Primary: ${admin.is_primary}`);
      console.log('');
    });
  } else {
    console.log('⚠️  Aucun admin trouvé dans agency_admins');
  }
}

checkAdmins().catch(console.error);
