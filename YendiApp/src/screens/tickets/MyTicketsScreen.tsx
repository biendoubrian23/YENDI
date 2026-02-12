import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Cache } from '../../lib/cache';

// Type pour une réservation
interface Reservation {
  reservation_id: string;
  seat_number: number;
  reservation_status: string;
  passenger_name: string | null;
  passenger_phone: string | null;
  reserved_at: string;
  trip_id: string;
  departure_datetime: string;
  arrival_datetime: string;
  price: number;
  trip_status: string;
  departure_city: string;
  arrival_city: string;
  agency_name: string;
  agency_color: string;
  duration_hours: number;
  trip_type: string;
  // Nouveaux champs pour les réservations groupées
  booking_group_id?: string | null;
  booked_by_client_id?: string | null;
  booked_by_phone?: string | null;
}

export default function MyTicketsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { clientProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Charger les réservations de l'utilisateur (cache-first, puis réseau)
  const fetchReservations = useCallback(async () => {
    if (!clientProfile) {
      setLoading(false);
      return;
    }

    try {
      // 1. Charger depuis le cache pour affichage immédiat
      const cached = await Cache.get<Reservation[]>(Cache.KEYS.RESERVATIONS);
      if (cached && cached.length > 0 && reservations.length === 0) {
        setReservations(cached);
        setLoading(false); // Arrêter le spinner dès qu'on a le cache
      }

      // 2. Tenter de charger depuis le réseau
      const { data, error } = await supabase
        .rpc('get_client_reservations', {
          p_client_id: clientProfile.id || null,
          p_phone: clientProfile.phone || null
        });

      if (error) {
        console.error('Erreur chargement réservations:', error);
        // Fallback : requête directe si la fonction RPC n'existe pas encore
        const filters: string[] = [];
        if (clientProfile.id) {
          filters.push(`booked_by_client_id.eq.${clientProfile.id}`);
        }
        if (clientProfile.phone) {
          filters.push(`passenger_phone.eq.${clientProfile.phone}`);
          filters.push(`booked_by_phone.eq.${clientProfile.phone}`);
        }
        
        if (filters.length > 0) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('all_reservations')
            .select('*')
            .or(filters.join(','))
            .order('reserved_at', { ascending: false });
          
          if (!fallbackError && fallbackData) {
            setReservations(fallbackData);
            await Cache.set(Cache.KEYS.RESERVATIONS, fallbackData);
          }
        }
        // Si tout échoue, le cache chargé en étape 1 reste visible
      } else {
        const freshData = data || [];
        setReservations(freshData);
        // 3. Mettre à jour le cache
        await Cache.set(Cache.KEYS.RESERVATIONS, freshData);
      }
    } catch (err) {
      console.error('Erreur:', err);
      // En cas d'erreur réseau totale, le cache reste affiché
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientProfile]);

  // Re-fetch à chaque fois que l'écran reçoit le focus (retour d'un paiement, changement d'onglet)
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchReservations();
    }, [fetchReservations])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReservations();
  };

  // Filtrer les réservations à venir vs historique
  const now = new Date();
  const upcomingTickets = reservations.filter(r => {
    const tripDate = new Date(r.departure_datetime);
    return tripDate >= now && r.reservation_status !== 'annule';
  });
  const historyTickets = reservations.filter(r => {
    const tripDate = new Date(r.departure_datetime);
    return tripDate < now || r.reservation_status === 'annule';
  });

  // Formatter la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('fr-FR', options);
  };

  // Formatter l'heure
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Formatter la durée
  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  // Obtenir le statut et la couleur
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'confirme':
        return { text: 'CONFIRMÉ', color: '#22c55e' };
      case 'reserve':
        return { text: 'EN ATTENTE', color: '#f59e0b' };
      case 'annule':
        return { text: 'ANNULÉ', color: '#ef4444' };
      default:
        return { text: status.toUpperCase(), color: '#6b7280' };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mes Billets</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.tabActive]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.tabTextActive]}>
            À venir
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
        }
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.emptyText}>Chargement...</Text>
          </View>
        ) : (
          <>
            {/* Upcoming Tickets */}
            {activeTab === 'upcoming' && (
              <>
                {upcomingTickets.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="ticket-outline" size={48} color={Colors.gray300} />
                    <Text style={styles.emptyText}>Aucune réservation à venir</Text>
                    <TouchableOpacity 
                      style={styles.searchButton}
                      onPress={() => navigation.navigate('HomeTab')}
                    >
                      <Text style={styles.searchButtonText}>Rechercher un trajet</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  upcomingTickets.map((ticket) => {
                    const status = getStatusDisplay(ticket.reservation_status);
                    const ticketId = `TR${ticket.reservation_id.slice(0, 5).toUpperCase()}`;
                    
                    return (
                      <View key={ticket.reservation_id} style={styles.ticketCard}>
                        {/* Status & ID */}
                        <View style={styles.ticketStatusRow}>
                          <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>
                              {status.text}
                            </Text>
                          </View>
                          <Text style={styles.ticketId}>#{ticketId}</Text>
                        </View>

                        {/* Times */}
                        <View style={styles.timesRow}>
                          <View style={styles.timeBlock}>
                            <Text style={styles.timeValue}>{formatTime(ticket.departure_datetime)}</Text>
                            <Text style={styles.timeCity}>{ticket.departure_city}</Text>
                          </View>

                          <View style={styles.durationCenter}>
                            <Text style={styles.durationText}>{formatDuration(ticket.duration_hours)}</Text>
                            <View style={styles.durationLineRow}>
                              <View style={styles.durationDot} />
                              <View style={styles.durationBar} />
                              <Ionicons name="bus" size={14} color={Colors.primary} />
                              <View style={styles.durationBar} />
                              <View style={styles.durationDot} />
                            </View>
                          </View>

                          <View style={[styles.timeBlock, { alignItems: 'flex-end' }]}>
                            <Text style={styles.timeValue}>{formatTime(ticket.arrival_datetime)}</Text>
                            <Text style={styles.timeCity}>{ticket.arrival_city}</Text>
                          </View>
                        </View>

                        {/* Date & Seat */}
                        <View style={styles.ticketInfoRow}>
                          <View style={styles.ticketInfoItem}>
                            <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
                            <Text style={styles.ticketInfoText}>{formatDate(ticket.departure_datetime)}</Text>
                          </View>
                          <View style={styles.ticketInfoItem}>
                            <Ionicons name="person-outline" size={14} color={Colors.textSecondary} />
                            <Text style={styles.ticketInfoText}>{ticket.seat_number}</Text>
                          </View>
                        </View>

                        {/* Actions */}
                        <View style={styles.ticketActions}>
                          <TouchableOpacity onPress={() => navigation.navigate('Invoice', { reservation: ticket })}>
                            <Text style={styles.detailsLink}>Voir détails &gt;</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.qrBtn}
                            onPress={() => navigation.navigate('ETicket', { 
                              ticketId: ticketId,
                              passengerName: ticket.passenger_name || clientProfile?.full_name || 'Passager',
                              seatNumber: ticket.seat_number,
                              departureCity: ticket.departure_city,
                              arrivalCity: ticket.arrival_city,
                              departureDate: formatDate(ticket.departure_datetime),
                              departureTime: formatTime(ticket.departure_datetime),
                              agencyName: ticket.agency_name,
                              fromMyTickets: true,
                            })}
                          >
                            <Ionicons name="grid" size={20} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                )}

                {/* Insurance Banner */}
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryGradientEnd]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.insuranceBanner}
                >
                  <View>
                    <Text style={styles.insuranceTitle}>Assurance voyage</Text>
                    <Text style={styles.insuranceSub}>Protégez votre trajet à 100%</Text>
                  </View>
                  <TouchableOpacity style={styles.insuranceBtn}>
                    <Text style={styles.insuranceBtnText}>Ajouter</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </>
            )}

            {activeTab === 'history' && (
              <>
                {historyTickets.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons name="time-outline" size={48} color={Colors.gray300} />
                    <Text style={styles.emptyText}>Aucun trajet passé</Text>
                  </View>
                ) : (
                  historyTickets.map((ticket) => {
                    const status = getStatusDisplay(ticket.reservation_status);
                    const ticketId = `TR${ticket.reservation_id.slice(0, 5).toUpperCase()}`;
                    
                    return (
                      <View key={ticket.reservation_id} style={styles.historyCard}>
                        <View style={styles.ticketStatusRow}>
                          <View style={[styles.statusBadge, { backgroundColor: status.color + '18' }]}>
                            <Text style={[styles.statusText, { color: status.color }]}>
                              {status.text}
                            </Text>
                          </View>
                          <Text style={styles.ticketId}>#{ticketId}</Text>
                        </View>
                        <Text style={styles.historyRoute}>
                          {ticket.departure_city} → {ticket.arrival_city}
                        </Text>
                        <Text style={styles.historyMeta}>
                          {formatDate(ticket.departure_datetime)} • {formatTime(ticket.departure_datetime)}
                        </Text>
                        <TouchableOpacity 
                          style={styles.historyArrow}
                          onPress={() => navigation.navigate('Invoice', { reservation: ticket })}
                        >
                          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl + 12,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.text,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xxl,
    backgroundColor: '#E8E8E8',
    borderRadius: BorderRadius.full,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: Colors.text,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.lg,
  },
  ticketCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ticketId: {
    fontSize: FontSize.sm,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  timeBlock: {
    alignItems: 'flex-start',
  },
  timeValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.text,
  },
  timeCity: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  durationCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  durationText: {
    fontSize: FontSize.xs,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  durationLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  durationDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.gray300,
  },
  durationBar: {
    flex: 1,
    height: 1.5,
    backgroundColor: Colors.gray200,
  },
  ticketInfoRow: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
  },
  ticketInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ticketInfoText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  ticketActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsLink: {
    fontSize: FontSize.md,
    color: Colors.text,
    fontWeight: '600',
  },
  qrBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pendingRoute: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  pendingMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  pendingArrow: {
    position: 'absolute',
    right: Spacing.xl,
    top: '50%',
  },
  insuranceBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    marginTop: Spacing.sm,
  },
  insuranceTitle: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.white,
  },
  insuranceSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  insuranceBtn: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  insuranceBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textTertiary,
  },
  searchButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
  },
  searchButtonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  historyRoute: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  historyArrow: {
    position: 'absolute',
    right: Spacing.xl,
    top: '50%',
  },
});
