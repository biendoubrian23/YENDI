const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fjvveodsmudowfhhvkff.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdnZlb2RzbXVkb3dmaGh2a2ZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MjUwMDgsImV4cCI6MjA4NjMwMTAwOH0.kSKcK-w9pWJzGFtyybxNmBElH3PtE7J7HvGuaZSNChM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealFinancesAPI() {
  console.log('🔍 Test de la nouvelle API /api/stats/real-finances\n');
  console.log('Cette API calcule les VRAIES données financières depuis seat_reservations\n');
  console.log('─'.repeat(60) + '\n');

  // Simuler l'appel API (en utilisant directement Supabase)
  const { data: reservations } = await supabase
    .from('seat_reservations')
    .select(`
      id,
      reserved_at,
      status,
      scheduled_trips (
        id,
        base_price,
        departure_datetime,
        agency_id,
        agencies (
          id,
          name,
          color,
          commission_rate
        )
      )
    `)
    .eq('status', 'confirme');

  // Agréger par agence
  const agencyMap = {};
  const tripsByAgency = {};

  (reservations || []).forEach((res) => {
    const trip = res.scheduled_trips;
    if (!trip || !trip.agencies) return;

    const agencyId = trip.agency_id;
    const agency = trip.agencies;
    const revenue = trip.base_price || 0;

    if (!agencyMap[agencyId]) {
      agencyMap[agencyId] = {
        agency_id: agencyId,
        agency_name: agency.name || 'Inconnu',
        agency_color: agency.color || '#6b7280',
        commission_rate: agency.commission_rate || 10,
        revenue: 0,
        reservations_count: 0,
        trips_count: 0,
      };
      tripsByAgency[agencyId] = new Set();
    }

    agencyMap[agencyId].revenue += revenue;
    agencyMap[agencyId].reservations_count += 1;
    tripsByAgency[agencyId].add(trip.id);
  });

  // Ajouter le nombre de trajets uniques
  Object.keys(agencyMap).forEach((agencyId) => {
    agencyMap[agencyId].trips_count = tripsByAgency[agencyId].size;
  });

  const agencies = Object.values(agencyMap);

  // Calculer les totaux
  const totalRevenue = agencies.reduce((sum, a) => sum + a.revenue, 0);
  const totalReservations = agencies.reduce((sum, a) => sum + a.reservations_count, 0);
  const totalTrips = agencies.reduce((sum, a) => sum + a.trips_count, 0);
  const totalCommission = agencies.reduce(
    (sum, a) => sum + (a.revenue * a.commission_rate) / 100,
    0
  );

  console.log('📊 TOTAUX GLOBAUX (toutes agences) :');
  console.log(`   💰 Chiffre d'Affaires: ${totalRevenue.toLocaleString('fr-FR')} FCFA`);
  console.log(`   💵 Commission Nette: ${Math.round(totalCommission).toLocaleString('fr-FR')} FCFA`);
  console.log(`   🚌 Trajets Effectués: ${totalTrips}`);
  console.log(`   🎫 Réservations: ${totalReservations}`);
  console.log('');

  console.log('─'.repeat(60));
  console.log('📋 DÉTAIL PAR AGENCE :\n');

  agencies
    .sort((a, b) => b.revenue - a.revenue)
    .forEach((a, index) => {
      const commission = Math.round((a.revenue * a.commission_rate) / 100);
      console.log(`${index + 1}. ${a.agency_name}`);
      console.log(`   💰 CA Brut: ${a.revenue.toLocaleString('fr-FR')} FCFA`);
      console.log(`   💵 Commission (${a.commission_rate}%): ${commission.toLocaleString('fr-FR')} FCFA`);
      console.log(`   🚌 Trajets: ${a.trips_count}`);
      console.log(`   🎫 Réservations: ${a.reservations_count}`);
      console.log(`   🎨 Couleur: ${a.agency_color}`);
      console.log('');
    });

  console.log('─'.repeat(60));
  console.log('\n✅ Ces données RÉELLES seront affichées dans :');
  console.log('   • Page Finances du Super Admin');
  console.log('   • Graphique avec filtres Jour/Semaine/Mois/Année');
  console.log('   • Tableau des agences avec CA, Commission, Croissance\n');
}

testRealFinancesAPI().catch(console.error);
