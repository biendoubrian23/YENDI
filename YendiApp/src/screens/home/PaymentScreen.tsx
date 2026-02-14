import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

const paymentMethods = [
  { id: 'momo', label: 'Mobile Money', icon: 'phone-portrait-outline', sub: 'MTN, Orange, etc.' },
  { id: 'visa', label: 'Visa terminant par 4242', icon: 'card', sub: 'Expire le 12/26' },
];

interface PassengerInfo {
  seatNumber: number;
  name: string;
  phone: string;
}

export default function PaymentScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { clientProfile, user } = useAuth();
  const { trip, seats, from, to, date, passengers = 1, passengerInfos } = route.params;
  const [selectedMethod, setSelectedMethod] = useState('momo');
  const [isLoading, setIsLoading] = useState(false);

  // Convertir seats en tableau si c'est un seul nombre (rétrocompatibilité)
  const seatsList: number[] = Array.isArray(seats) ? seats : [seats];
  const passengerCount = passengers || seatsList.length;
  
  // Construire les infos passagers
  const buildPassengerInfos = (): PassengerInfo[] => {
    // Si on a déjà des infos passagers (plusieurs passagers)
    if (passengerInfos && passengerInfos.length > 0) {
      return passengerInfos;
    }
    // Sinon, c'est un seul passager (l'utilisateur connecté)
    return seatsList.map((seat: number) => ({
      seatNumber: seat,
      name: clientProfile?.full_name || 'Passager',
      phone: clientProfile?.phone || '',
    }));
  };

  const finalPassengerInfos = buildPassengerInfos();
  const totalPrice = (trip.dynamicPrice || trip.priceValue) * passengerCount;

  const handlePay = async () => {
    setIsLoading(true);
    
    try {
      // Construire le tableau de passagers pour la fonction RPC
      const passengersData = finalPassengerInfos.map(p => ({
        seat_number: p.seatNumber,
        name: p.name,
        phone: p.phone,
      }));

      // Appeler la fonction RPC pour créer la réservation groupée
      const unitPrice = trip.dynamicPrice || trip.priceValue;
      const { data, error } = await supabase.rpc('create_group_reservation', {
        p_scheduled_trip_id: trip.scheduledTripId,
        p_passengers: passengersData,
        p_booked_by_client_id: user?.id || null,
        p_booked_by_name: clientProfile?.full_name || finalPassengerInfos[0]?.name || 'Client',
        p_booked_by_phone: clientProfile?.phone || finalPassengerInfos[0]?.phone || '',
        p_booked_by_email: clientProfile?.email || user?.email || null,
        p_payment_method: selectedMethod === 'momo' ? 'mobile_money' : 'card',
        p_unit_price: unitPrice !== trip.priceValue ? unitPrice : null,
      });

      if (error) {
        console.error('Reservation error:', error);
        
        // Gérer les erreurs spécifiques
        if (error.code === '23505') {
          // Violation de contrainte unique = siège déjà pris
          Alert.alert(
            'Siège indisponible', 
            'Un ou plusieurs sièges que vous avez sélectionnés viennent d\'être réservés par un autre passager. Veuillez revenir en arrière et choisir d\'autres places.',
            [{ text: 'Choisir d\'autres places', onPress: () => navigation.navigate('SeatSelection', { trip, from, to, date }) }]
          );
        } else {
          Alert.alert('Erreur', 'Impossible de créer la réservation. Veuillez réessayer.');
        }
        setIsLoading(false);
        return;
      }

      // Vérifier le résultat de la fonction
      if (!data.success) {
        // Message d'erreur personnalisé de la fonction
        Alert.alert(
          'Réservation impossible', 
          data.error || 'Une erreur est survenue.',
          data.conflict_seats 
            ? [{ text: 'Choisir d\'autres places', onPress: () => navigation.navigate('SeatSelection', { trip, from, to, date }) }]
            : [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }

      // Construire les données de tickets pour l'écran ETicket
      const ticketIds = data.ticket_ids || [];
      const tickets = finalPassengerInfos.map((p, index) => ({
        ticketId: ticketIds[index] || `YD${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
        seatNumber: p.seatNumber,
        passengerName: p.name,
        passengerPhone: p.phone,
      }));

      // Succès - naviguer vers le e-ticket
      navigation.navigate('ETicket', {
        trip,
        tickets,
        from,
        to,
        date,
        bookingGroupId: data.booking_group_id,
        totalAmount: data.total_amount,
        departureLocation: trip.departureLocation || 'Gare routière',
        arrivalLocation: trip.arrivalLocation || 'Gare routière',
      });
    } catch (err) {
      console.error('Payment error:', err);
      Alert.alert('Erreur', 'Une erreur est survenue lors du paiement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Recap Card */}
        <View style={styles.recapCard}>
          <Text style={styles.recapLabel}>RÉCAPITULATIF</Text>
          <View style={styles.recapRouteRow}>
            <Text style={styles.recapRoute}>{from} → {to}</Text>
            <View style={styles.directBadge}>
              <Text style={styles.directBadgeText}>Direct</Text>
            </View>
          </View>
          <Text style={styles.recapMeta}>
            Lun, {date} • {trip.departureTime} - {trip.arrivalTime}
          </Text>
          <View style={styles.recapDivider} />
          
          {/* Passagers */}
          <Text style={styles.passengersTitle}>
            {passengerCount} Passager{passengerCount > 1 ? 's' : ''}
          </Text>
          {finalPassengerInfos.map((p, index) => (
            <View key={p.seatNumber} style={styles.passengerRow}>
              <View style={styles.passengerInfo}>
                <Text style={styles.passengerName}>{p.name}</Text>
                <Text style={styles.passengerPhone}>{p.phone}</Text>
              </View>
              <View style={styles.seatBadge}>
                <Text style={styles.seatBadgeText}>Siège {p.seatNumber}</Text>
              </View>
            </View>
          ))}
          
          <View style={styles.recapDivider} />
          <View style={styles.recapInfoRow}>
            <Text style={styles.recapInfoLabel}>Prix unitaire</Text>
            <Text style={styles.recapInfoValue}>{(trip.dynamicPrice || trip.priceValue).toLocaleString('fr-FR')} FCFA</Text>
          </View>
          {passengerCount > 1 && (
            <View style={styles.recapInfoRow}>
              <Text style={styles.recapInfoLabel}>Nombre de places</Text>
              <Text style={styles.recapInfoValue}>x{passengerCount}</Text>
            </View>
          )}
          <View style={styles.recapDivider} />
          <View style={styles.recapInfoRow}>
            <Text style={styles.recapTotalLabel}>Total à payer</Text>
            <Text style={styles.recapTotalValue}>{totalPrice.toLocaleString('fr-FR')} FCFA</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentSectionTitle}>MOYEN DE PAIEMENT</Text>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                selectedMethod === method.id && styles.paymentMethodActive,
              ]}
              onPress={() => setSelectedMethod(method.id)}
            >
              <View style={styles.paymentMethodLeft}>
                <View style={styles.paymentIcon}>
                  <Ionicons
                    name={method.icon as any}
                    size={20}
                    color={method.id === 'momo' ? '#FFC107' : Colors.primary}
                  />
                </View>
                <View>
                  <Text style={styles.paymentMethodLabel}>{method.label}</Text>
                  {method.sub && (
                    <Text style={styles.paymentMethodSub}>{method.sub}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.radio, selectedMethod === method.id && styles.radioActive]}>
                {selectedMethod === method.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}

          {/* Add card */}
          <TouchableOpacity style={styles.addCard}>
            <Ionicons name="add" size={20} color={Colors.textSecondary} />
            <Text style={styles.addCardText}>Ajouter une carte</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Montant total</Text>
          <Text style={styles.totalValue}>{totalPrice.toLocaleString('fr-FR')} FCFA</Text>
        </View>
        <TouchableOpacity onPress={handlePay} activeOpacity={0.85} disabled={isLoading}>
          <LinearGradient
            colors={isLoading ? [Colors.gray300, Colors.gray300] : [Colors.primary, Colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.payBtn}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color={Colors.white} />
                <Text style={styles.payBtnText}>Traitement en cours...</Text>
              </>
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color={Colors.white} />
                <Text style={styles.payBtnText}>Payer et Confirmer</Text>
              </>
            )}
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  recapCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    marginBottom: Spacing.xxl,
  },
  recapLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  recapRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  recapRoute: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.text,
  },
  directBadge: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 2,
  },
  directBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  recapMeta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  recapDivider: {
    height: 1,
    backgroundColor: Colors.gray100,
    marginVertical: Spacing.md,
  },
  passengersTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  passengerPhone: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  seatBadge: {
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  seatBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  recapInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
  },
  recapInfoLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  recapInfoValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  recapTotalLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  recapTotalValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.primary,
  },
  paymentSection: {
    gap: Spacing.md,
  },
  paymentSectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBorder,
  },
  paymentMethodActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}06`,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentMethodSub: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  addCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.gray300,
    borderRadius: BorderRadius.lg,
  },
  addCardText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bottomBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  totalLabel: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: FontSize.xxl,
    fontWeight: '800',
    color: Colors.primary,
  },
  payBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  payBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
});
