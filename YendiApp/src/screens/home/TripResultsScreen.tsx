import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

/* ───── Date helpers ───── */
const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const DAYS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const generateDateList = (range = 14) => {
  const today = new Date();
  const dates: { id: string; dayName: string; dayNum: number; monthName: string; isToday: boolean }[] = [];
  for (let i = -1; i < range; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push({
      id: `date_${i}`,
      dayName: i === -1 ? 'Hier' : i === 0 ? "Auj." : i === 1 ? 'Dem.' : DAYS_SHORT[d.getDay()],
      dayNum: d.getDate(),
      monthName: MONTHS_SHORT[d.getMonth()],
      isToday: i === 0,
    });
  }
  return dates;
};

/* ───── Filter constants ───── */
const COMPANIES = ['Général Express', 'Touristique Express', 'Buca Voyages'];
const TIME_SLOTS = [
  { id: 'morning', label: 'Matin', sub: '06:00 - 12:00', icon: 'sunny' as const },
  { id: 'afternoon', label: 'Après-midi', sub: '12:00 - 18:00', icon: 'partly-sunny' as const },
  { id: 'evening', label: 'Soir', sub: '18:00 - 00:00', icon: 'moon' as const },
];
const FEATURES_LIST = [
  { id: 'clim', label: 'Climatisé', icon: 'snow' as const },
  { id: 'wc', label: 'WC', icon: 'water' as const },
  { id: 'wifi', label: 'Wifi', icon: 'wifi' as const },
  { id: 'prise', label: 'Prise', icon: 'flash' as const },
  { id: 'bagage', label: 'Bagage inclus', icon: 'bag-handle' as const },
];
const TRIP_TYPES = ['Direct', '1 Arrêt', '2+ Arrêts'];

export default function TripResultsScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { from, to, date, dateISO, passengers } = route.params;

  /* Trip data from Supabase */
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Date state - initialize from passed dateISO */
  const dateList = generateDateList();
  const todayIndex = dateList.findIndex((d) => d.isToday);
  
  // Find the index matching the passed date
  const getInitialDateId = () => {
    if (!dateISO) return dateList[todayIndex]?.id ?? dateList[0].id;
    const passedDate = new Date(dateISO);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    passedDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round((passedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    // dateList starts at -1 (yesterday), so index = diffDays + 1
    const targetIndex = diffDays + 1;
    if (targetIndex >= 0 && targetIndex < dateList.length) {
      return dateList[targetIndex].id;
    }
    return dateList[todayIndex]?.id ?? dateList[0].id;
  };
  
  const [selectedDateId, setSelectedDateId] = useState(getInitialDateId);
  const dateScrollRef = useRef<ScrollView>(null);

  /* ─── Fetch trips from Supabase ─── */
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate the selected date directly here
      const selectedTab = dateList.find((d) => d.id === selectedDateId);
      const today = new Date();
      const idx = selectedTab ? dateList.indexOf(selectedTab) : 1;
      const queryDate = new Date(today);
      queryDate.setDate(today.getDate() + (idx - 1)); // -1 because index 0 = yesterday
      
      // Build date strings in YYYY-MM-DD format for timezone-safe querying
      const year = queryDate.getFullYear();
      const month = String(queryDate.getMonth() + 1).padStart(2, '0');
      const day = String(queryDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Query using date string comparison (works regardless of timezone)
      const startOfDayUTC = `${dateStr}T00:00:00`;
      const endOfDayUTC = `${dateStr}T23:59:59`;

      // Query scheduled_trips with route info and agency info
      const { data, error: fetchError } = await supabase
        .from('scheduled_trips')
        .select(`
          id,
          departure_datetime,
          arrival_datetime,
          base_price,
          total_seats,
          available_seats_count,
          available_seat_numbers,
          status,
          driver_name,
          route:routes!inner (
            id,
            departure_city,
            departure_location,
            arrival_city,
            arrival_location,
            stops
          ),
          agency:agencies!inner (
            id,
            name
          ),
          bus:buses!inner (
            id,
            plate,
            brand,
            model,
            features,
            seats,
            seat_layout
          )
        `)
        .eq('status', 'actif')
        .gte('departure_datetime', startOfDayUTC)
        .lte('departure_datetime', endOfDayUTC)
        .order('departure_datetime', { ascending: true });

      if (fetchError) {
        console.error('Supabase error:', fetchError);
        setError('Impossible de charger les trajets.');
        setTrips([]);
        return;
      }

      if (!data || data.length === 0) {
        setTrips([]);
        return;
      }

      // Filter by departure and arrival cities
      const filteredData = data.filter((trip: any) => {
        const r = Array.isArray(trip.route) ? trip.route[0] : trip.route;
        return (
          r.departure_city.toLowerCase() === from.toLowerCase() &&
          r.arrival_city.toLowerCase() === to.toLowerCase()
        );
      });

      // Transform to the format expected by the UI
      const COMPANY_COLORS: Record<string, string> = {};
      const COLOR_PALETTE = ['#6C63FF', '#E53E3E', '#3182CE', '#38A169', '#D69E2E', '#9B59B6'];
      let colorIndex = 0;

      const formattedTrips = filteredData.map((trip: any) => {
        const r = Array.isArray(trip.route) ? trip.route[0] : trip.route;
        const agency = Array.isArray(trip.agency) ? trip.agency[0] : trip.agency;
        const bus = Array.isArray(trip.bus) ? trip.bus[0] : trip.bus;

        // Assign a consistent color per agency
        if (!COMPANY_COLORS[agency.name]) {
          COMPANY_COLORS[agency.name] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
          colorIndex++;
        }

        // Extract time directly from ISO string and add 1 hour for timezone correction
        const extractTimeFromISO = (isoString: string) => {
          // Format: "2026-02-12T11:00:00+00:00" or "2026-02-12T11:00:00.000Z"
          const match = isoString.match(/T(\d{2}):(\d{2})/);
          if (match) {
            let hours = parseInt(match[1], 10) + 1; // Add 1 hour
            if (hours >= 24) hours -= 24; // Handle midnight overflow
            return `${hours.toString().padStart(2, '0')}:${match[2]}`;
          }
          // Fallback to Date parsing if no match
          const d = new Date(isoString);
          let hours = d.getUTCHours() + 1;
          if (hours >= 24) hours -= 24;
          return `${hours.toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
        };

        const depTime = new Date(trip.departure_datetime);
        const arrTime = new Date(trip.arrival_datetime);

        // Calculate duration
        const diffMs = arrTime.getTime() - depTime.getTime();
        const diffH = Math.floor(diffMs / (1000 * 60 * 60));
        const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const duration = diffM > 0 ? `${diffH}h ${diffM.toString().padStart(2, '0')}m` : `${diffH}h`;

        // Determine trip type from stops
        const stops = r.stops || [];
        const type = stops.length === 0 ? 'Direct' : stops.length === 1 ? '1 Arrêt' : `${stops.length} Arrêts`;

        // Build features from bus info
        const busFeatures = bus.features || [];
        const features: string[] = [];
        if (busFeatures.includes('Clim')) features.push('Climatisé');
        if (busFeatures.includes('WiFi')) features.push('Wifi');
        if (busFeatures.includes('WC')) features.push('WC');
        if (busFeatures.includes('Prises USB')) features.push('Prise');
        if (busFeatures.includes('TV')) features.push('TV');

        // Format price
        const priceFormatted = `${trip.base_price.toLocaleString('fr-FR')} FCFA`;

        // Seats left warning
        const seatsLeft = trip.available_seats_count <= 5 ? trip.available_seats_count : null;

        return {
          id: trip.id,
          company: agency.name,
          companyColor: COMPANY_COLORS[agency.name],
          departureTime: extractTimeFromISO(trip.departure_datetime),
          arrivalTime: extractTimeFromISO(trip.arrival_datetime),
          duration,
          type,
          price: priceFormatted,
          priceValue: trip.base_price,
          features: features.length > 0 ? features : ['Climatisé'],
          seatsLeft,
          // Extra data for seat selection
          busId: bus.id,
          routeId: r.id,
          scheduledTripId: trip.id,
          totalSeats: trip.total_seats,
          availableSeatsCount: trip.available_seats_count,
          availableSeatNumbers: trip.available_seat_numbers,
          busSeats: bus.seats,
          busSeatLayout: bus.seat_layout,
          departureLocation: r.departure_location,
          arrivalLocation: r.arrival_location,
        };
      });

      setTrips(formattedTrips);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Une erreur est survenue.');
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, selectedDateId, dateList]);

  // Fetch on mount and when selected date changes
  useEffect(() => {
    fetchTrips();
  }, [selectedDateId]);

  /* Filter modal state */
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterCompanies, setFilterCompanies] = useState<string[]>([]);
  const [filterTimeSlots, setFilterTimeSlots] = useState<string[]>([]);
  const [filterFeatures, setFilterFeatures] = useState<string[]>([]);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterDirectOnly, setFilterDirectOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'departure' | 'duration'>('price');

  const handleSelectTrip = (trip: any) => {
    navigation.navigate('SeatSelection', { trip, from, to, date, passengers });
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'Wifi': return 'wifi';
      case 'No Wifi': return 'wifi';
      case 'Prise': return 'flash';
      case 'WC': return 'water';
      case '1 Bagage': return 'bag-handle';
      case 'Climatisé': return 'snow';
      default: return 'ellipse';
    }
  };

  /* Toggle helpers */
  const toggleArrayItem = (arr: string[], item: string) =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const resetFilters = () => {
    setFilterCompanies([]);
    setFilterTimeSlots([]);
    setFilterFeatures([]);
    setFilterTypes([]);
    setFilterDirectOnly(false);
    setSortBy('price');
  };

  const activeFilterCount =
    filterCompanies.length + filterTimeSlots.length + filterFeatures.length + filterTypes.length + (filterDirectOnly ? 1 : 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ───── Header ───── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerRoute}>{from} → {to}</Text>
          <Text style={styles.headerMeta}>{date} • {passengers} passager{passengers > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterVisible(true)}>
          <Ionicons name="options-outline" size={22} color={Colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ───── Scrollable Date Tabs ───── */}
      <ScrollView
        ref={dateScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateTabsContainer}
        onLayout={() => {
          if (todayIndex > 0) {
            dateScrollRef.current?.scrollTo({ x: todayIndex * 72, animated: false });
          }
        }}
      >
        {dateList.map((tab) => {
          const isActive = selectedDateId === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setSelectedDateId(tab.id)}
              activeOpacity={0.8}
            >
              {isActive ? (
                <LinearGradient
                  colors={['#6C63FF', '#5B4FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.dateTabActive}
                >
                  <Text style={styles.dateTabDayActive}>{tab.dayName}</Text>
                  <Text style={styles.dateTabNumActive}>{tab.dayNum}</Text>
                  <Text style={styles.dateTabMonthActive}>{tab.monthName}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.dateTab}>
                  <Text style={styles.dateTabDay}>{tab.dayName}</Text>
                  <Text style={styles.dateTabNum}>{tab.dayNum}</Text>
                  <Text style={styles.dateTabMonth}>{tab.monthName}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ───── Trip List ───── */}
      <View style={styles.resultsContainer}>
        {loading && (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Recherche des trajets...</Text>
          </View>
        )}

        {!loading && error && (
          <View style={styles.centerContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={Colors.danger} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchTrips}>
              <Text style={styles.retryBtnText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && trips.length === 0 && (
          <View style={styles.centerContainer}>
            <Ionicons name="bus-outline" size={48} color={Colors.gray400} />
            <Text style={styles.emptyTitle}>Aucun trajet trouvé</Text>
            <Text style={styles.emptyText}>
              Pas de trajet disponible pour {from} → {to} à cette date.{"\n"}Essayez une autre date.
            </Text>
          </View>
        )}

        {!loading && !error && trips.length > 0 && (
          <FlatList
            data={trips}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tripList}
            showsVerticalScrollIndicator={false}
            style={styles.tripListContainer}
            renderItem={({ item }) => (
              <View style={styles.tripCard}>
              {/* Row 1: Company badge left + Price right */}
              <View style={styles.tripRow1}>
                <View style={[styles.companyBadge, { borderColor: item.companyColor, borderWidth: 1.5 }]}>
                  <Text style={[styles.companyText, { color: item.companyColor }]}>{item.company}</Text>
                </View>
                <Text style={styles.priceText}>{item.price}</Text>
              </View>

              {/* Row 2: Departure left ──── Arrival right (under price) */}
              <View style={styles.timesRow}>
                <View style={styles.timeLeft}>
                  <Text style={styles.timeText}>{item.departureTime}</Text>
                </View>
                <View style={styles.durationLine}>
                  <View style={styles.durationDot} />
                  <View style={styles.durationBar} />
                  <View style={styles.durationDot} />
                </View>
                <View style={styles.timeRight}>
                  <Text style={styles.timeText}>{item.arrivalTime}</Text>
                </View>
              </View>

              {/* Row 3: Duration & Type */}
              <Text style={styles.metaText}>{item.duration} • {item.type}</Text>

              {/* Divider */}
              <View style={styles.cardDivider} />

              {/* Row 4: Features + Select Button */}
              <View style={styles.tripFooter}>
                <View style={styles.featuresRow}>
                  {item.features.map((f: string, i: number) => (
                    <View key={i} style={styles.featureItem}>
                      <Ionicons
                        name={getFeatureIcon(f) as any}
                        size={14}
                        color={f === 'No Wifi' ? Colors.gray400 : Colors.gray500}
                      />
                      <Text style={[styles.featureText, f === 'No Wifi' && { color: Colors.gray400 }]}>
                        {f}
                      </Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.selectBtn}
                  onPress={() => handleSelectTrip(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectBtnText}>Sélectionner</Text>
                </TouchableOpacity>
              </View>

              {/* Seats warning */}
              {item.seatsLeft && (
                <View style={styles.seatsWarning}>
                  <Ionicons name="flame" size={13} color={Colors.danger} />
                  <Text style={styles.seatsWarningText}>
                    Plus que {item.seatsLeft} sièges à ce prix !
                  </Text>
                </View>
              )}
            </View>
            )}
          />
        )}
      </View>

      {/* ═══════════════ FILTER MODAL ═══════════════ */}
      <Modal visible={filterVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtres</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* ── Trier par ── */}
              <Text style={styles.sectionTitle}>Trier par</Text>
              <View style={styles.chipRow}>
                {([
                  { id: 'price' as const, label: 'Prix', icon: 'cash-outline' as const },
                  { id: 'departure' as const, label: 'Départ', icon: 'time-outline' as const },
                  { id: 'duration' as const, label: 'Durée', icon: 'hourglass-outline' as const },
                ]).map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.chip, sortBy === s.id && styles.chipActive]}
                    onPress={() => setSortBy(s.id)}
                  >
                    <Ionicons name={s.icon} size={16} color={sortBy === s.id ? '#fff' : Colors.textSecondary} />
                    <Text style={[styles.chipText, sortBy === s.id && styles.chipTextActive]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Heure de départ ── */}
              <Text style={styles.sectionTitle}>Heure de départ</Text>
              <View style={styles.chipRow}>
                {TIME_SLOTS.map((slot) => {
                  const active = filterTimeSlots.includes(slot.id);
                  return (
                    <TouchableOpacity
                      key={slot.id}
                      style={[styles.timeChip, active && styles.chipActive]}
                      onPress={() => setFilterTimeSlots(toggleArrayItem(filterTimeSlots, slot.id))}
                    >
                      <Ionicons name={slot.icon} size={18} color={active ? '#fff' : '#6C63FF'} />
                      <Text style={[styles.timeChipLabel, active && styles.chipTextActive]}>{slot.label}</Text>
                      <Text style={[styles.timeChipSub, active && { color: 'rgba(255,255,255,0.7)' }]}>{slot.sub}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Compagnies ── */}
              <Text style={styles.sectionTitle}>Compagnies</Text>
              {COMPANIES.map((c) => {
                const active = filterCompanies.includes(c);
                return (
                  <TouchableOpacity
                    key={c}
                    style={styles.checkRow}
                    onPress={() => setFilterCompanies(toggleArrayItem(filterCompanies, c))}
                  >
                    <View style={[styles.checkbox, active && styles.checkboxActive]}>
                      {active && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                    <Text style={styles.checkLabel}>{c}</Text>
                  </TouchableOpacity>
                );
              })}

              {/* ── Type de trajet ── */}
              <Text style={styles.sectionTitle}>Type de trajet</Text>
              <View style={styles.chipRow}>
                {TRIP_TYPES.map((t) => {
                  const active = filterTypes.includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setFilterTypes(toggleArrayItem(filterTypes, t))}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{t}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* ── Direct uniquement ── */}
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Trajets directs uniquement</Text>
                <Switch
                  value={filterDirectOnly}
                  onValueChange={setFilterDirectOnly}
                  trackColor={{ false: '#E5E5EE', true: '#6C63FF' }}
                  thumbColor="#fff"
                />
              </View>

              {/* ── Équipements ── */}
              <Text style={styles.sectionTitle}>Équipements</Text>
              <View style={styles.chipRow}>
                {FEATURES_LIST.map((f) => {
                  const active = filterFeatures.includes(f.id);
                  return (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.featureChip, active && styles.chipActive]}
                      onPress={() => setFilterFeatures(toggleArrayItem(filterFeatures, f.id))}
                    >
                      <Ionicons name={f.icon} size={16} color={active ? '#fff' : Colors.gray500} />
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                <Text style={styles.resetBtnText}>Réinitialiser</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setFilterVisible(false)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#6C63FF', '#5B4FE8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.applyBtnGrad}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.applyBtnText}>Appliquer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ═══════════════════════════════════════════ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FC',
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRoute: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  headerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  filterBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },

  /* ── Scrollable Date Tabs ── */
  dateTabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  dateTab: {
    width: 64,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E5EE',
    alignItems: 'center',
  },
  dateTabActive: {
    width: 64,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  dateTabDay: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  dateTabNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginVertical: 2,
  },
  dateTabMonth: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.textTertiary,
  },
  dateTabDayActive: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  dateTabNumActive: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    marginVertical: 2,
  },
  dateTabMonthActive: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },

  /* ── Trip List ── */
  tripList: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 30,
    gap: 14,
  },

  tripListContainer: {
    flex: 1,
  },

  resultsContainer: {
    flex: 1,
    alignItems: 'stretch',
  },

  /* ── Trip Card ── */
  tripCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderWidth: 1,
    borderColor: '#EDEDF5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },

  /* Row 1: company + price */
  tripRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  companyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  companyText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#6C63FF',
  },

  /* Row 2: times — arrival right-aligned under price */
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  timeLeft: {
    // departure stays left
  },
  timeRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  durationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    width: 70,
  },
  durationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.gray300,
  },
  durationBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: '#E0E0EA',
    marginHorizontal: 2,
  },

  /* Row 3: duration */
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
    marginBottom: 2,
  },

  /* Divider */
  cardDivider: {
    height: 1,
    backgroundColor: '#F2F2F8',
    marginVertical: 14,
  },

  /* Features + select */
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuresRow: {
    flexDirection: 'row',
    gap: 14,
    flexShrink: 1,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: Colors.gray500,
    fontWeight: '500',
  },
  selectBtn: {
    borderWidth: 1.5,
    borderColor: '#6C63FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginLeft: 10,
  },
  selectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C63FF',
  },

  /* Seats warning */
  seatsWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
  },
  seatsWarningText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '600',
  },

  /* ═══════ FILTER MODAL ═══════ */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F8',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F4FA',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Sections */
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 20,
    marginBottom: 12,
  },

  /* Chips */
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F4F4FA',
  },
  chipActive: {
    backgroundColor: '#6C63FF',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },

  /* Time chips */
  timeChip: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F4F4FA',
    minWidth: 100,
  },
  timeChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 4,
  },
  timeChipSub: {
    fontSize: 10,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  /* Feature chips */
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F4F4FA',
  },

  /* Checkbox rows */
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D4D4DE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },
  checkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },

  /* Switch */
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },

  /* Modal Footer */
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F8',
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E5EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  applyBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
  },

  /* Loading, Error & Empty States */
  centerContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    marginTop: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.text,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
  },
  retryBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
