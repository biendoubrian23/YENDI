const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjvveodsmudowfhhvkff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnZlb2RzbXVkb3dmaGh2a2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjUwMDgsImV4cCI6MjA4NjMwMTAwOH0.kSKcK-w9pWJzGFtyybxNmBElH3PtE7J7HvGuaZSNChM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgenciesWithAdmin() {
  console.log('🔍 Vérification des agences avec/sans admin...\n');
  
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('id, name, city, status, agency_admins(profile_id, is_primary, profiles(full_name, email))')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!agencies || agencies.length === 0) {
    console.log('⚠️  Aucune agence trouvée');
    return;
  }

  const withAdmin = [];
  const withoutAdmin = [];

  agencies.forEach((agency) => {
    const admins = agency.agency_admins || [];
    if (admins.length > 0) {
      withAdmin.push(agency);
    } else {
      withoutAdmin.push(agency);
    }
  });

  console.log(`✅ Total: ${agencies.length} agences\n`);
  console.log(`📊 Avec admin: ${withAdmin.length} agences`);
  withAdmin.forEach((a, i) => {
    const primary = a.agency_admins.find(ad => ad.is_primary);
    const adminName = primary?.profiles?.full_name || 'N/A';
    console.log(`   ${i + 1}. ${a.name} - Admin: ${adminName}`);
  });

  console.log(`\n❌ Sans admin: ${withoutAdmin.length} agences (SERONT MASQUÉES)`);
  withoutAdmin.forEach((a, i) => {
    console.log(`   ${i + 1}. ${a.name} (${a.city}) - Status: ${a.status}`);
  });
}

checkAgenciesWithAdmin().catch(console.error);
