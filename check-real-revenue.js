const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjvveodsmudowfhhvkff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnZlb2RzbXVkb3dmaGh2a2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjUwMDgsImV4cCI6MjA4NjMwMTAwOH0.kSKcK-w9pWJzGFtyybxNmBElH3PtE7J7HvGuaZSNChM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealRevenue() {
  console.log('🔍 Analyse des revenus réels par agence...\n');
  
  // 1. Vérifier les réservations confirmées pour Buca Voyage
  const bucaId = '248a2329-e95c-4665-8276-ae87dfaa9eea';
  
  const { data: reservations, error: resError } = await supabase
    .from('seat_reservations')
    .select('*, scheduled_trips(base_price, agency_id, agencies(name))')
    .eq('status', 'confirme');

  if (resError) {
    console.error('❌ Erreur réservations:', resError.message);
    return;
  }

  console.log(`✅ ${reservations?.length || 0} réservations confirmées trouvées\n`);

  // Agréger par agence
  const revenueByAgency = {};
  
  (reservations || []).forEach((res) => {
    const trip = res.scheduled_trips;
    if (!trip) return;
    
    const agencyId = trip.agency_id;
    const agencyName = trip.agencies?.name || 'Unknown';
    const price = trip.base_price || 0;
    
    if (!revenueByAgency[agencyId]) {
      revenueByAgency[agencyId] = {
        name: agencyName,
        revenue: 0,
        count: 0
      };
    }
    
    revenueByAgency[agencyId].revenue += price;
    revenueByAgency[agencyId].count += 1;
  });

  console.log('📊 Revenus par agence (depuis seat_reservations) :\n');
  Object.entries(revenueByAgency).forEach(([agencyId, data]) => {
    console.log(`${data.name}:`);
    console.log(`  💰 Revenu total: ${data.revenue.toLocaleString('fr-FR')} FCFA`);
    console.log(`  📋 Réservations: ${data.count}`);
    console.log('');
  });

  // 2. Vérifier financial_records
  const { data: finRecords, error: finError } = await supabase
    .from('financial_records')
    .select('*, agencies(name)')
    .order('created_at', { ascending: false });

  if (finError) {
    console.error('❌ Erreur financial_records:', finError.message);
    return;
  }

  console.log(`\n📋 Table financial_records: ${finRecords?.length || 0} records\n`);
  if (finRecords && finRecords.length > 0) {
    finRecords.forEach((rec) => {
      console.log(`${rec.agencies?.name || 'N/A'} - ${rec.year}/${rec.month}`);
      console.log(`  CA Brut: ${rec.ca_brut?.toLocaleString('fr-FR') || 0} FCFA`);
      console.log(`  Commission: ${rec.commission_amount?.toLocaleString('fr-FR') || 0} FCFA`);
      console.log('');
    });
  }
}

checkRealRevenue().catch(console.error);
