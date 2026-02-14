const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjvveodsmudowfhhvkff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnZlb2RzbXVkb3dmaGh2a2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjUwMDgsImV4cCI6MjA4NjMwMTAwOH0.kSKcK-w9pWJzGFtyybxNmBElH3PtE7J7HvGuaZSNChM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAgencies() {
  console.log('🔍 Vérification des agences dans la base de données...\n');
  
  const { data: agencies, error } = await supabase
    .from('agencies')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Erreur:', error.message);
    return;
  }

  if (!agencies || agencies.length === 0) {
    console.log('⚠️  Aucune agence trouvée dans la base de données');
    return;
  }

  console.log(`✅ ${agencies.length} agence(s) trouvée(s) dans la base de données:\n`);
  
  agencies.forEach((agency, index) => {
    console.log(`${index + 1}. ${agency.name}`);
    console.log(`   📋 ID: ${agency.id}`);
    console.log(`   🔢 Registration: ${agency.registration_number || 'N/A'}`);
    console.log(`   📍 Localisation: ${agency.city}, ${agency.country}`);
    console.log(`   📊 Statut: ${agency.status}`);
    console.log(`   📅 Créée le: ${new Date(agency.created_at).toLocaleDateString('fr-FR')}`);
    console.log('');
  });

  console.log('\n📊 Résumé:');
  const statusCount = agencies.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(statusCount).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
}

checkAgencies().catch(console.error);
