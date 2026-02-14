import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { supabase } from '../../lib/supabase';

// Interface pour le layout des sièges
interface SeatLayout {
  left: number;
  right: number;
  back_row: number;
  rows: number;
}

// Layout par défaut
const DEFAULT_LAYOUT: SeatLayout = { left: 2, right: 2, back_row: 5, rows: 12 };

export default function SeatSelectionScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { trip, from, to, date, passengers = 1 } = route.params;
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [reservedSeats, setReservedSeats] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Nombre de passagers à sélectionner
  const requiredSeats = passengers;

  // Récupérer le layout du bus depuis les params du trip
  const seatLayout: SeatLayout = trip.busSeatLayout || DEFAULT_LAYOUT;
  const busSeats: number = trip.busSeats || 50;
  const availableSeatNumbers: number[] = trip.availableSeatNumbers || [];

  // Calculer le nombre total de places selon le layout
  const totalLayoutSeats = (seatLayout.rows * (seatLayout.left + seatLayout.right)) + (seatLayout.back_row || 0);
  const totalSeats = Math.min(busSeats, totalLayoutSeats);

  // Récupérer les sièges déjà réservés depuis Supabase
  const fetchReservedSeats = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('seat_reservations')
        .select('seat_number')
        .eq('scheduled_trip_id', trip.scheduledTripId)
        .in('status', ['reserve', 'confirme']);

      if (error) {
        console.error('Error fetching reservations:', error);
        return;
      }

      if (data) {
        setReservedSeats(data.map((r: any) => r.seat_number));
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  }, [trip.scheduledTripId]);

  useEffect(() => {
    fetchReservedSeats();
  }, [fetchReservedSeats]);

  // Déterminer le statut d'un siège
  const getSeatStatus = (seatNum: number): 'free' | 'occupied' | 'selected' | 'unavailable' => {
    if (selectedSeats.includes(seatNum)) return 'selected';
    
    // Siège déjà réservé par quelqu'un
    if (reservedSeats.includes(seatNum)) return 'occupied';
    
    // Si availableSeatNumbers est défini et non vide, seuls ces sièges sont disponibles à la vente
    if (availableSeatNumbers.length > 0) {
      if (!availableSeatNumbers.includes(seatNum)) return 'unavailable';
    }
    
    return 'free';
  };

  // Générer les rangées de sièges
  const generateSeatRows = () => {
    const rows: { row: number; leftSeats: number[]; rightSeats: number[] }[] = [];
    let seatNum = 1;

    for (let rowIdx = 0; rowIdx < seatLayout.rows; rowIdx++) {
      const leftSeats: number[] = [];
      const rightSeats: number[] = [];

      // Sièges côté gauche
      for (let i = 0; i < seatLayout.left; i++) {
        if (seatNum <= totalSeats) {
          leftSeats.push(seatNum++);
        }
      }

      // Sièges côté droit
      for (let i = 0; i < seatLayout.right; i++) {
        if (seatNum <= totalSeats) {
          rightSeats.push(seatNum++);
        }
      }

      rows.push({ row: rowIdx + 1, leftSeats, rightSeats });
    }

    return rows;
  };

  // Générer la rangée arrière
  const generateBackRow = () => {
    if (!seatLayout.back_row || seatLayout.back_row === 0) return [];
    
    const backSeats: number[] = [];
    const normalRowsSeats = seatLayout.rows * (seatLayout.left + seatLayout.right);
    let seatNum = normalRowsSeats + 1;

    for (let i = 0; i < seatLayout.back_row; i++) {
      if (seatNum <= totalSeats) {
        backSeats.push(seatNum++);
      }
    }

    return backSeats;
  };

  const seatRows = generateSeatRows();
  const backRowSeats = generateBackRow();

  const handleSeatPress = (seatNum: number) => {
    const status = getSeatStatus(seatNum);
    if (status === 'occupied' || status === 'unavailable') return;
    
    setSelectedSeats(prev => {
      // Si déjà sélectionné, le retirer
      if (prev.includes(seatNum)) {
        return prev.filter(s => s !== seatNum);
      }
      // Si on a déjà le nombre requis de sièges, remplacer le premier
      if (prev.length >= requiredSeats) {
        return [...prev.slice(1), seatNum];
      }
      // Sinon, ajouter
      return [...prev, seatNum];
    });
  };

  const handleConfirm = () => {
    if (selectedSeats.length !== requiredSeats) return;
    
    // Si un seul passager et c'est l'utilisateur connecté, aller directement au paiement
    if (requiredSeats === 1) {
      navigation.navigate('Payment', {
        trip,
        seats: selectedSeats,
        from,
        to,
        date,
        passengers: requiredSeats,
      });
    } else {
      // Plusieurs passagers: aller à l'écran d'infos passagers
      navigation.navigate('PassengerInfo', {
        trip,
        seats: selectedSeats,
        from,
        to,
        date,
        passengers: requiredSeats,
      });
    }
  };

  // Rendu d'un siège
  const renderSeat = (seatNum: number) => {
    const status = getSeatStatus(seatNum);
    return (
      <TouchableOpacity
        key={seatNum}
        style={[
          styles.seat,
          status === 'free' && styles.seatFree,
          status === 'occupied' && styles.seatOccupied,
          status === 'unavailable' && styles.seatUnavailable,
          status === 'selected' && styles.seatSelected,
        ]}
        disabled={status === 'occupied' || status === 'unavailable'}
        onPress={() => handleSeatPress(seatNum)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.seatText,
            (status === 'occupied' || status === 'unavailable') && styles.seatTextOccupied,
            status === 'selected' && styles.seatTextSelected,
          ]}
        >
          {seatNum}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement des places...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Choisissez votre place</Text>
          <Text style={styles.headerSub}>{trip.company} • {trip.departureTime}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendFree]} />
            <Text style={styles.legendText}>Libre</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendOccupied]} />
            <Text style={styles.legendText}>Occupé</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendSelected]} />
            <Text style={styles.legendText}>Ma place</Text>
          </View>
        </View>

        {/* Bus layout */}
        <View style={styles.busContainer}>
          {/* Avant du bus */}
          <View style={styles.busFront}>
            <Ionicons name="tv-outline" size={14} color={Colors.gray400} />
            <Text style={styles.busFrontText}>Avant</Text>
          </View>

          {/* Rangées de sièges */}
          <View style={styles.seatsContainer}>
            {seatRows.map((row) => (
              <View key={row.row} style={styles.seatRow}>
                {/* Sièges côté gauche */}
                <View style={styles.seatPair}>
                  {row.leftSeats.map((seatNum) => renderSeat(seatNum))}
                </View>

                {/* Allée centrale */}
                <View style={styles.aisle} />

                {/* Sièges côté droit */}
                <View style={styles.seatPair}>
                  {row.rightSeats.map((seatNum) => renderSeat(seatNum))}
                </View>
              </View>
            ))}

            {/* Rangée arrière */}
            {backRowSeats.length > 0 && (
              <View style={styles.backRowContainer}>
                <View style={styles.backRowSeats}>
                  {backRowSeats.map((seatNum) => renderSeat(seatNum))}
                </View>
              </View>
            )}
          </View>

          {/* Arrière du bus */}
          <View style={styles.busBack}>
            <Text style={styles.busBackText}>Arrière</Text>
          </View>
        </View>

        {/* Info capacité */}
        <Text style={styles.capacityInfo}>
          {totalSeats} places • {seatLayout.left}+{seatLayout.right} par rangée • {seatLayout.rows} rangées
          {seatLayout.back_row > 0 ? ` + ${seatLayout.back_row} arrière` : ''}
        </Text>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.bottomTopRow}>
          <Text style={styles.bottomLabel}>
            Prix total ({requiredSeats} {requiredSeats > 1 ? 'Adultes' : 'Adulte'})
          </Text>
          <Text style={styles.seatCounter}>
            {selectedSeats.length}/{requiredSeats} places
          </Text>
        </View>
        <View style={styles.bottomPriceRow}>
          <Text style={styles.bottomPrice}>
            {((trip.dynamicPrice || trip.priceValue) * requiredSeats).toLocaleString('fr-FR')} FCFA
          </Text>
          {selectedSeats.length > 0 && (
            <Text style={styles.bottomSeat}>
              Sièges: {selectedSeats.sort((a, b) => a - b).join(', ')}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={selectedSeats.length !== requiredSeats}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selectedSeats.length === requiredSeats ? [Colors.primary, Colors.primaryGradientEnd] : [Colors.gray300, Colors.gray300]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>
              {selectedSeats.length === requiredSeats 
                ? (requiredSeats > 1 ? 'Confirmer les places' : 'Confirmer la place')
                : `Sélectionnez ${requiredSeats - selectedSeats.length} place${requiredSeats - selectedSeats.length > 1 ? 's' : ''}`
              }
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
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
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxl,
    marginBottom: Spacing.xxl,
    marginTop: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendDot: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  legendFree: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
  },
  legendOccupied: {
    backgroundColor: '#FFE4E4',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  legendSelected: {
    backgroundColor: Colors.primary,
  },
  legendText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  busContainer: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderWidth: 1,
    borderColor: '#EDEDF5',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  busFront: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gray100,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  busFrontText: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '500',
    marginLeft: 4,
  },
  seatsContainer: {
    alignItems: 'center',
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  seatPair: {
    flexDirection: 'row',
    gap: 6,
  },
  aisle: {
    width: 24,
  },
  seat: {
    width: 44,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seatFree: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.gray300,
  },
  seatOccupied: {
    backgroundColor: '#FFE4E4',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  seatUnavailable: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  seatSelected: {
    backgroundColor: Colors.primary,
  },
  seatText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  seatTextOccupied: {
    color: '#EF4444',
  },
  seatTextSelected: {
    color: Colors.white,
  },
  backRowContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    borderStyle: 'dashed',
  },
  backRowSeats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  busBack: {
    marginTop: 16,
    backgroundColor: Colors.gray100,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 40,
  },
  busBackText: {
    fontSize: 10,
    color: Colors.gray400,
    fontWeight: '500',
  },
  capacityInfo: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.gray400,
    marginTop: Spacing.md,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingTop: 22,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  seatCounter: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  bottomPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bottomPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
  },
  bottomSeat: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  confirmBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
});
