import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

interface PassengerInfo {
  seatNumber: number;
  name: string;
  phone: string;
}

export default function PassengerInfoScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { clientProfile, user } = useAuth();
  const { trip, seats, from, to, date, passengers } = route.params;

  // Récupérer le nom et téléphone avec fallback sur user_metadata
  const getMainUserName = () => {
    const name = clientProfile?.full_name || user?.user_metadata?.full_name;
    if (name && name !== 'Client') return name;
    return '';
  };
  
  const getMainUserPhone = () => {
    return clientProfile?.phone || '';
  };

  // Le premier siège est pour l'utilisateur connecté (pas de formulaire)
  const mainUserSeat = seats[0];
  const additionalSeats = seats.slice(1); // Les sièges des passagers supplémentaires

  // Initialiser les infos SEULEMENT pour les passagers supplémentaires
  const initialAdditionalPassengers: PassengerInfo[] = additionalSeats.map((seat: number) => ({
    seatNumber: seat,
    name: '',
    phone: '',
  }));

  const [additionalPassengers, setAdditionalPassengers] = useState<PassengerInfo[]>(initialAdditionalPassengers);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const updatePassenger = (index: number, field: 'name' | 'phone', value: string) => {
    const updated = [...additionalPassengers];
    updated[index] = { ...updated[index], [field]: value };
    setAdditionalPassengers(updated);
    
    // Clear error when user types
    const errorKey = `${index}-${field}`;
    if (errors[errorKey]) {
      const newErrors = { ...errors };
      delete newErrors[errorKey];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // Valider uniquement les passagers supplémentaires
    additionalPassengers.forEach((passenger, index) => {
      if (!passenger.name.trim()) {
        newErrors[`${index}-name`] = 'Le nom est requis';
      }
      if (!passenger.phone.trim()) {
        newErrors[`${index}-phone`] = 'Le téléphone est requis';
      } else if (!/^[+]?[\d\s-]{8,}$/.test(passenger.phone.trim())) {
        newErrors[`${index}-phone`] = 'Numéro invalide';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) return;
    
    // Construire le tableau complet : utilisateur principal + passagers supplémentaires
    const allPassengerInfos: PassengerInfo[] = [
      {
        seatNumber: mainUserSeat,
        name: getMainUserName() || 'Client',
        phone: getMainUserPhone(),
      },
      ...additionalPassengers,
    ];
    
    navigation.navigate('Payment', {
      trip,
      seats,
      from,
      to,
      date,
      passengers,
      passengerInfos: allPassengerInfos,
    });
  };

  const totalPrice = trip.priceValue * passengers;
  const additionalCount = additionalSeats.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {additionalCount > 0 ? 'Passagers supplémentaires' : 'Confirmation'}
          </Text>
          <Text style={styles.headerSub}>
            {additionalCount > 0 
              ? `${additionalCount} personne${additionalCount > 1 ? 's' : ''} à renseigner`
              : '1 passager'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Trip recap */}
          <View style={styles.tripRecap}>
            <View style={styles.tripRoute}>
              <Ionicons name="location" size={16} color={Colors.primary} />
              <Text style={styles.tripRouteText}>{from} → {to}</Text>
            </View>
            <Text style={styles.tripDate}>{date} • {trip.departureTime}</Text>
          </View>

          {/* Carte utilisateur principal (vous) - non modifiable */}
          <View style={[styles.passengerCard, styles.mainUserCard]}>
            <View style={styles.passengerHeader}>
              <View style={[styles.passengerBadge, styles.mainUserBadge]}>
                <Ionicons name="person" size={14} color={Colors.white} />
              </View>
              <View style={styles.passengerHeaderText}>
                <Text style={styles.passengerTitle}>Vous (Passager principal)</Text>
                <Text style={styles.passengerSeat}>Siège {mainUserSeat}</Text>
              </View>
              <View style={styles.confirmedBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
              </View>
            </View>

            <View style={styles.mainUserInfo}>
              <View style={styles.mainUserRow}>
                <Ionicons name="person-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.mainUserText}>{getMainUserName() || 'Non renseigné'}</Text>
              </View>
              <View style={styles.mainUserRow}>
                <Ionicons name="call-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.mainUserText}>{getMainUserPhone() || 'Non renseigné'}</Text>
              </View>
            </View>
          </View>

          {/* Formulaires pour les passagers supplémentaires uniquement */}
          {additionalPassengers.map((passenger, index) => (
            <View key={passenger.seatNumber} style={styles.passengerCard}>
              <View style={styles.passengerHeader}>
                <View style={styles.passengerBadge}>
                  <Ionicons name="person-add" size={14} color={Colors.white} />
                </View>
                <View style={styles.passengerHeaderText}>
                  <Text style={styles.passengerTitle}>
                    Passager supplémentaire {index + 1}
                  </Text>
                  <Text style={styles.passengerSeat}>Siège {passenger.seatNumber}</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nom complet *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors[`${index}-name`] && styles.inputError
                  ]}
                  placeholder="Ex: Jean Dupont"
                  placeholderTextColor={Colors.gray400}
                  value={passenger.name}
                  onChangeText={(text) => updatePassenger(index, 'name', text)}
                  autoCapitalize="words"
                />
                {errors[`${index}-name`] && (
                  <Text style={styles.errorText}>{errors[`${index}-name`]}</Text>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Numéro de téléphone *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors[`${index}-phone`] && styles.inputError
                  ]}
                  placeholder="Ex: +237 699 123 456"
                  placeholderTextColor={Colors.gray400}
                  value={passenger.phone}
                  onChangeText={(text) => updatePassenger(index, 'phone', text)}
                  keyboardType="phone-pad"
                />
                {errors[`${index}-phone`] && (
                  <Text style={styles.errorText}>{errors[`${index}-phone`]}</Text>
                )}
              </View>
            </View>
          ))}

          {/* Info note */}
          <View style={styles.infoNote}>
            <Ionicons name="information-circle" size={18} color={Colors.primary} />
            <Text style={styles.infoNoteText}>
              {additionalCount > 0 
                ? 'Chaque passager recevra son e-billet par SMS au numéro renseigné.'
                : 'Votre e-billet sera envoyé sur votre numéro de téléphone.'}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.bottomTopRow}>
            <Text style={styles.bottomLabel}>
              Total ({passengers} place{passengers > 1 ? 's' : ''})
            </Text>
            <Text style={styles.bottomSeats}>
              Sièges: {seats.sort((a: number, b: number) => a - b).join(', ')}
            </Text>
          </View>
          <Text style={styles.bottomPrice}>
            {totalPrice.toLocaleString('fr-FR')} FCFA
          </Text>
          <TouchableOpacity onPress={handleContinue} activeOpacity={0.85}>
            <LinearGradient
              colors={[Colors.primary, Colors.primaryGradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtn}
            >
              <Text style={styles.continueBtnText}>Continuer vers le paiement</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  tripRecap: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  tripRouteText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  tripDate: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginLeft: 24,
  },
  passengerCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  mainUserCard: {
    borderWidth: 2,
    borderColor: '#22c55e20',
    backgroundColor: '#f0fdf4',
  },
  passengerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  passengerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainUserBadge: {
    backgroundColor: '#22c55e',
  },
  confirmedBadge: {
    marginLeft: 'auto',
  },
  passengerHeaderText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  passengerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.text,
  },
  passengerSeat: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
  },
  mainUserInfo: {
    gap: Spacing.sm,
  },
  mainUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  mainUserText: {
    fontSize: FontSize.md,
    color: Colors.text,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    fontSize: FontSize.md,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.gray200,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: FontSize.xs,
    color: '#ef4444',
    marginTop: Spacing.xs,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  infoNoteText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.primary,
    lineHeight: 20,
  },
  bottomBar: {
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingTop: 18,
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
  bottomSeats: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  bottomPrice: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 14,
  },
  continueBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  continueBtnText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.white,
  },
});
